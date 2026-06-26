package com.exiros.tracker.service

import android.app.Notification
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.app.Service
import android.content.Context
import android.content.Intent
import android.content.pm.ServiceInfo
import android.location.Location
import android.os.Build
import android.os.IBinder
import androidx.core.app.NotificationCompat
import androidx.core.app.ServiceCompat
import androidx.core.content.ContextCompat
import com.exiros.tracker.BuildConfig
import com.exiros.tracker.MainActivity
import com.exiros.tracker.R
import com.exiros.tracker.data.ActiveTripEntity
import com.exiros.tracker.data.CaptureConfig
import com.exiros.tracker.data.Fix
import com.exiros.tracker.data.LocationCapture
import com.exiros.tracker.data.TripRepository
import com.exiros.tracker.sync.SyncScheduler
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.Job
import kotlinx.coroutines.SupervisorJob
import kotlinx.coroutines.cancel
import kotlinx.coroutines.delay
import kotlinx.coroutines.isActive
import kotlinx.coroutines.launch

/**
 * Mantiene el rastreo vivo con la app en 2º plano o la pantalla apagada (Foreground Service
 * tipado `location`, Android 14). Aloja [LocationCapture] (antes vivía en la pantalla M3) y
 * escribe cada fix en Room. Cambia entre cadencia normal e hibernación según las transiciones
 * de actividad que le manda [ActivityTransitionReceiver].
 */
class TrackingService : Service() {

    private val scope = CoroutineScope(SupervisorJob() + Dispatchers.Main)
    private lateinit var repo: TripRepository
    private lateinit var capture: LocationCapture

    private var tripId: String? = null
    private var activeTrip: ActiveTripEntity? = null
    private var hibernating = false
    private var arrivalSynced = false // un solo sync prioritario al anticipar la llegada
    private var firstPointSynced = false // envío inmediato del primer punto (origen del viaje)

    // Modo demo (BuildConfig.DEMO_TRACKING_SECONDS > 0): captura+envío cada N seg, sin filtro de
    // distancia ni hibernación, para VER el camión moverse en vivo. 0 = producción (sin cambio).
    private val demoSeconds = BuildConfig.DEMO_TRACKING_SECONDS
    private var demoSyncJob: Job? = null

    override fun onCreate() {
        super.onCreate()
        repo = TripRepository(applicationContext)
        capture = LocationCapture(applicationContext)
        createChannel()
    }

    override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
        when (intent?.action) {
            ACTION_STOP -> {
                stopTracking()
                return START_NOT_STICKY
            }
            ACTION_ACTIVITY_UPDATE -> {
                applyHibernation(intent.getBooleanExtra(EXTRA_STILL, false))
                return START_STICKY
            }
        }

        // ACTION_START o reinicio del sistema (intent nulo con START_STICKY).
        // Android 14 exige startForeground en los primeros segundos, ANTES de cualquier espera.
        startForegroundNow(getString(R.string.tracking_starting))
        ActivityTransitionReceiver.register(this)
        SyncScheduler.schedulePeriodic(this) // envío por lotes cada ~15 min mientras dure el viaje
        startCapture()
        return START_STICKY
    }

    /** Lee el viaje activo y arranca la captura. Si ya no hay viaje, se detiene. */
    private fun startCapture() {
        scope.launch {
            val trip = repo.getActiveTrip()
            if (trip == null) {
                stopTracking()
                return@launch
            }
            tripId = trip.tripId
            activeTrip = trip
            updateNotification(getString(R.string.tracking_active, trip.destinationName))
            capture.start(captureConfig(), ::handleFix)
            if (demoSeconds > 0) startDemoSyncLoop()
        }
    }

    /** Config de captura: en demo, rápida y sin filtro; en producción, MOVING/HIBERNATING. */
    private fun captureConfig(): CaptureConfig = when {
        demoSeconds > 0 -> CaptureConfig(intervalMs = demoSeconds * 1000L, minDistanceMeters = 0f)
        hibernating -> LocationCapture.HIBERNATING
        else -> LocationCapture.MOVING
    }

    /** Solo en demo: fuerza un envío cada N seg para que el portal vea el avance en vivo. */
    private fun startDemoSyncLoop() {
        if (demoSyncJob?.isActive == true) return
        demoSyncJob = scope.launch {
            while (isActive) {
                delay(demoSeconds * 1000L)
                SyncScheduler.syncNow(this@TrackingService)
            }
        }
    }

    /** Encola el fix y, si cae cerca de la geocerca, dispara un sync prioritario (sin detener
     *  GPS) para que el backend evalúe el cierre cuanto antes (anticipación de llegada, 4.1).
     *
     *  Si el camión sigue en el mismo sitio, saltamos el punto para no refrescar `lastLocation`
     *  ni gastar datos. La excepción es la geocerca: ese punto sí debe llegar al backend para
     *  permitir el cierre automático. */
    private fun handleFix(fix: Fix) {
        val id = tripId ?: return
        val trip = activeTrip
        scope.launch {
            val nearDestination = trip?.let { isNearDestination(fix, it) } ?: false
            if (!nearDestination && isSameStoppedPosition(id, fix)) return@launch

            repo.recordPoint(id, fix.lat, fix.lng, fix.accuracyMeters, fix.recordedAt)
            // Primer punto del viaje (el origen): envíalo de inmediato para que el portal
            // muestre el inicio sin esperar el ciclo de ~15 min. Una sola vez por servicio.
            if (!firstPointSynced) {
                firstPointSynced = true
                SyncScheduler.syncNow(this@TrackingService)
            }

            if (nearDestination && !arrivalSynced) {
                arrivalSynced = true
                SyncScheduler.syncNow(this@TrackingService)
            }
        }
    }

    private suspend fun isSameStoppedPosition(tripId: String, fix: Fix): Boolean {
        val last = repo.lastLocationSnapshot(tripId) ?: return false
        return distanceMeters(fix.lat, fix.lng, last.lat, last.lng) <= STATIONARY_SKIP_DISTANCE_M
    }

    private fun isNearDestination(fix: Fix, trip: ActiveTripEntity): Boolean =
        distanceMeters(fix.lat, fix.lng, trip.centerLat, trip.centerLng) <=
            trip.radiusMeters + ARRIVAL_MARGIN_M

    private fun distanceMeters(fromLat: Double, fromLng: Double, toLat: Double, toLng: Double): Float {
        val out = FloatArray(1)
        Location.distanceBetween(fromLat, fromLng, toLat, toLng, out)
        return out[0]
    }

    /** Cambia la cadencia según el camión esté detenido (STILL) o en marcha. */
    private fun applyHibernation(still: Boolean) {
        if (demoSeconds > 0) return // en demo no hibernamos: captura constante para ver el avance
        if (still == hibernating) return
        hibernating = still
        tripId ?: return
        val config: CaptureConfig =
            if (still) LocationCapture.HIBERNATING else LocationCapture.MOVING
        capture.start(config, ::handleFix)
        val trip = getString(R.string.tracking_active_state, if (still) "detenido" else "en marcha")
        updateNotification(trip)
    }

    private fun stopTracking() {
        demoSyncJob?.cancel()
        capture.stop()
        ActivityTransitionReceiver.unregister(this)
        SyncScheduler.cancel(this)
        ServiceCompat.stopForeground(this, ServiceCompat.STOP_FOREGROUND_REMOVE)
        stopSelf()
    }

    override fun onDestroy() {
        demoSyncJob?.cancel()
        capture.stop()
        ActivityTransitionReceiver.unregister(this)
        scope.cancel()
        super.onDestroy()
    }

    override fun onBind(intent: Intent?): IBinder? = null

    // --- Notificación ---

    private fun startForegroundNow(text: String) {
        val type = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
            ServiceInfo.FOREGROUND_SERVICE_TYPE_LOCATION
        } else {
            0
        }
        ServiceCompat.startForeground(this, NOTIF_ID, buildNotification(text), type)
    }

    private fun updateNotification(text: String) {
        val nm = getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
        nm.notify(NOTIF_ID, buildNotification(text))
    }

    private fun buildNotification(text: String): Notification {
        val open = PendingIntent.getActivity(
            this,
            0,
            Intent(this, MainActivity::class.java),
            PendingIntent.FLAG_IMMUTABLE,
        )
        return NotificationCompat.Builder(this, CHANNEL_ID)
            .setContentTitle(getString(R.string.tracking_title))
            .setContentText(text)
            .setSmallIcon(android.R.drawable.ic_menu_mylocation)
            .setOngoing(true)
            .setContentIntent(open)
            .setForegroundServiceBehavior(NotificationCompat.FOREGROUND_SERVICE_IMMEDIATE)
            .build()
    }

    private fun createChannel() {
        // minSdk 26 → el canal de notificación siempre aplica (sin guarda de versión).
        val channel = NotificationChannel(
            CHANNEL_ID,
            getString(R.string.tracking_channel),
            NotificationManager.IMPORTANCE_LOW,
        )
        val nm = getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
        nm.createNotificationChannel(channel)
    }

    companion object {
        private const val CHANNEL_ID = "tracking"
        private const val NOTIF_ID = 1
        private const val ARRIVAL_MARGIN_M = 100f // margen sobre el radio para anticipar llegada
        private const val STATIONARY_SKIP_DISTANCE_M = 50f // jitter GPS: mismo sitio, no enviar

        const val ACTION_START = "com.exiros.tracker.START"
        const val ACTION_STOP = "com.exiros.tracker.STOP"
        const val ACTION_ACTIVITY_UPDATE = "com.exiros.tracker.ACTIVITY_UPDATE"
        const val EXTRA_STILL = "still"

        fun start(context: Context) {
            val intent = Intent(context, TrackingService::class.java).setAction(ACTION_START)
            ContextCompat.startForegroundService(context, intent)
        }

        fun stop(context: Context) {
            val intent = Intent(context, TrackingService::class.java).setAction(ACTION_STOP)
            context.startService(intent)
        }
    }
}
