package com.exiros.tracker.sync

import android.content.Context
import android.util.Log
import androidx.work.CoroutineWorker
import androidx.work.WorkerParameters
import com.exiros.tracker.data.ApiClient
import com.exiros.tracker.data.TripRepository
import java.time.Instant
import java.util.UUID

/**
 * Drena la cola de Room al backend (3.3 → 3.4) y, si el operador pidió cerrar, manda el cierre
 * (4.2). Idempotente: el `batchId` se deriva de los ids de los puntos y el cierre lleva su
 * `closeRequestId` → un reintento no duplica. Si el backend indica `stopTracking` (geocerca o
 * cierre admin) o el cierre del operador se confirma, marca el viaje CONCLUIDO localmente
 * (→ la app pasa a M5 y el servicio se detiene).
 */
class SyncWorker(context: Context, params: WorkerParameters) :
    CoroutineWorker(context, params) {

    override suspend fun doWork(): Result {
        val repo = TripRepository(applicationContext)
        val trip = repo.getActiveTrip() ?: return Result.success()
        if (trip.status != "EN_RUTA") return Result.success() // ya concluido localmente
        val api = ApiClient()

        return try {
            // Motivo de cierre: lo da el backend (geocerca/admin) o, si fue el operador, es local.
            var closureType: String? = null

            val pending = repo.unsentLocations(trip.tripId)
            if (pending.isNotEmpty()) {
                val seed = "${trip.tripId}:" + pending.joinToString(",") { it.id.toString() }
                val batchId = UUID.nameUUIDFromBytes(seed.toByteArray()).toString()
                closureType = api.sendBatch(trip.tripId, trip.tripToken, batchId, pending)
                repo.markSent(pending.map { it.id })
            }

            if (trip.pendingClose && trip.closeRequestId != null) {
                api.closeTrip(
                    tripId = trip.tripId,
                    tripToken = trip.tripToken,
                    closeRequestId = trip.closeRequestId,
                    requestedAt = Instant.ofEpochMilli(trip.closeRequestedAt ?: System.currentTimeMillis()).toString(),
                    observations = trip.closeObservations.orEmpty(),
                )
                // Si la geocerca/admin no lo había cerrado ya, el motivo es cierre por operador.
                if (closureType == null) closureType = "MANUAL_OPERATOR"
            }

            if (closureType != null) {
                repo.markConcluded(closureType)
                Log.i(TAG, "Viaje ${trip.tripId} concluido ($closureType) → la app detiene el rastreo")
            }
            Result.success()
        } catch (e: Exception) {
            Log.w(TAG, "Fallo de sync, se reintentará: ${e.message}")
            Result.retry()
        }
    }

    private companion object {
        const val TAG = "SyncWorker"
    }
}
