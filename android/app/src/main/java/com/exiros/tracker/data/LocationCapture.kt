package com.exiros.tracker.data

import android.annotation.SuppressLint
import android.content.Context
import android.location.Location
import android.os.Looper
import com.google.android.gms.location.CurrentLocationRequest
import com.google.android.gms.location.LocationCallback
import com.google.android.gms.location.LocationRequest
import com.google.android.gms.location.LocationResult
import com.google.android.gms.location.LocationServices
import com.google.android.gms.location.Priority

/** Un fix de ubicación fusionado (GPS+WiFi+celular). */
data class Fix(val lat: Double, val lng: Double, val accuracyMeters: Double, val recordedAt: Long)

/**
 * Captura pasiva con FusedLocation mientras M3 está en primer plano (3.1).
 * El distance-filter, ActivityRecognition y la supervivencia en 2º plano vía Foreground
 * Service son 3.2: aquí solo pedimos updates y los entregamos al callback.
 */
class LocationCapture(context: Context) {
    private val client = LocationServices.getFusedLocationProviderClient(context)
    private var callback: LocationCallback? = null

    @SuppressLint("MissingPermission")
    fun start(onFix: (Fix) -> Unit) {
        if (callback != null) return // ya activo
        // Cadencia de demo (5 s). HIGH_ACCURACY usa el GPS (lo que el emulador alimenta con
        // `geo fix`); el perfil de energía + distance filter reales los fija 3.2.
        val request = LocationRequest.Builder(Priority.PRIORITY_HIGH_ACCURACY, INTERVAL_MS)
            .setMinUpdateIntervalMillis(INTERVAL_MS)
            .build()
        val cb = object : LocationCallback() {
            override fun onLocationResult(result: LocationResult) {
                result.lastLocation?.let { emit(it, onFix) }
            }
        }
        callback = cb
        client.requestLocationUpdates(request, cb, Looper.getMainLooper())

        // Semilla: primer fix inmediato (la suscripción periódica puede tardar el 1er ciclo).
        val current = CurrentLocationRequest.Builder()
            .setPriority(Priority.PRIORITY_HIGH_ACCURACY)
            .build()
        client.getCurrentLocation(current, null).addOnSuccessListener { loc ->
            if (loc != null && callback != null) emit(loc, onFix)
        }
    }

    private fun emit(loc: Location, onFix: (Fix) -> Unit) {
        onFix(
            Fix(
                lat = loc.latitude,
                lng = loc.longitude,
                accuracyMeters = if (loc.hasAccuracy()) loc.accuracy.toDouble() else DEFAULT_ACCURACY,
                recordedAt = if (loc.time > 0) loc.time else System.currentTimeMillis(),
            ),
        )
    }

    fun stop() {
        callback?.let { client.removeLocationUpdates(it) }
        callback = null
    }

    private companion object {
        const val INTERVAL_MS = 5_000L
        const val DEFAULT_ACCURACY = 9999.0
    }
}
