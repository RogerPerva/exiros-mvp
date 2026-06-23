package com.exiros.tracker.data

import com.exiros.tracker.BuildConfig
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import okhttp3.MediaType.Companion.toMediaType
import okhttp3.MultipartBody
import okhttp3.OkHttpClient
import okhttp3.Request
import okhttp3.RequestBody.Companion.toRequestBody
import org.json.JSONArray
import org.json.JSONObject
import java.util.concurrent.TimeUnit

/** Destino del catálogo (dropdown de M2) + snapshot de geocerca que viaja al estado del viaje. */
data class Destination(
    val id: String,
    val name: String,
    val centerLat: Double,
    val centerLng: Double,
    val radiusMeters: Double,
)

/** Respuesta de POST /api/mobile/trips. */
data class TripResult(val tripId: String, val tripToken: String, val status: String)

private val JSON = "application/json".toMediaType()

/** Cliente HTTP del espacio mobile (X-App-Key). Una instancia, reutilizable. */
class ApiClient {
    private val client = OkHttpClient.Builder()
        .connectTimeout(15, TimeUnit.SECONDS)
        .readTimeout(20, TimeUnit.SECONDS)
        .build()

    private val base = BuildConfig.API_BASE_URL

    /** GET catálogo activo de destinos. */
    suspend fun fetchDestinations(): List<Destination> = withContext(Dispatchers.IO) {
        val req = Request.Builder()
            .url("$base/api/mobile/destinations")
            .header("x-app-key", BuildConfig.APP_KEY)
            .get()
            .build()
        client.newCall(req).execute().use { res ->
            val body = res.body?.string().orEmpty()
            if (!res.isSuccessful) error("destinos HTTP ${res.code}: $body")
            val arr = JSONArray(body)
            (0 until arr.length()).map { i ->
                val o = arr.getJSONObject(i)
                Destination(
                    id = o.getString("id"),
                    name = o.getString("name"),
                    centerLat = o.getDouble("centerLat"),
                    centerLng = o.getDouble("centerLng"),
                    radiusMeters = o.getDouble("radiusMeters"),
                )
            }
        }
    }

    /** POST multipart: 7 campos + foto. Devuelve el viaje creado o lanza con el detalle. */
    suspend fun createTrip(
        providerNumber: String,
        providerName: String,
        folio: String,
        frontPlate: String,
        rearPlate: String?,
        destinationId: String,
        deviceId: String,
        clientRequestId: String,
        photoBytes: ByteArray,
        photoFilename: String,
        photoMime: String,
    ): TripResult = withContext(Dispatchers.IO) {
        val builder = MultipartBody.Builder().setType(MultipartBody.FORM)
            .addFormDataPart("providerNumber", providerNumber)
            .addFormDataPart("providerName", providerName)
            .addFormDataPart("folio", folio)
            .addFormDataPart("frontPlate", frontPlate)
            .addFormDataPart("destinationId", destinationId)
            .addFormDataPart("deviceId", deviceId)
            .addFormDataPart("clientRequestId", clientRequestId)
            .addFormDataPart(
                "photo",
                photoFilename,
                photoBytes.toRequestBody(photoMime.toMediaType()),
            )
        if (!rearPlate.isNullOrBlank()) builder.addFormDataPart("rearPlate", rearPlate)

        val req = Request.Builder()
            .url("$base/api/mobile/trips")
            .header("x-app-key", BuildConfig.APP_KEY)
            .post(builder.build())
            .build()

        client.newCall(req).execute().use { res ->
            val body = res.body?.string().orEmpty()
            if (!res.isSuccessful) error("trip HTTP ${res.code}: $body")
            val o = JSONObject(body)
            TripResult(
                tripId = o.getString("tripId"),
                tripToken = o.getString("tripToken"),
                status = o.getString("status"),
            )
        }
    }

    /**
     * Envía un lote de puntos comprimido con GZIP (3.3 → 3.4). `batchId` da idempotencia:
     * reenviar el mismo lote no duplica en el backend. Lanza si la respuesta no es 2xx
     * (el WorkManager decide reintentar). Devuelve `stopTracking` (lo usará Fase 4).
     */
    suspend fun sendBatch(
        tripId: String,
        tripToken: String,
        batchId: String,
        points: List<LocationEntity>,
    ): Boolean = withContext(Dispatchers.IO) {
        val arr = JSONArray()
        for (p in points) {
            arr.put(
                JSONObject()
                    .put("lat", p.lat)
                    .put("lng", p.lng)
                    .put("accuracyMeters", p.accuracyMeters)
                    .put("recordedAt", java.time.Instant.ofEpochMilli(p.recordedAt).toString()),
            )
        }
        val payload = JSONObject().put("batchId", batchId).put("points", arr).toString()
        val body = gzip(payload.toByteArray(Charsets.UTF_8)).toRequestBody(JSON)
        val req = Request.Builder()
            .url("$base/api/mobile/trips/$tripId/locations")
            .header("Authorization", "Bearer $tripToken")
            .header("Content-Encoding", "gzip")
            .post(body)
            .build()
        client.newCall(req).execute().use { res ->
            val resBody = res.body?.string().orEmpty()
            if (!res.isSuccessful) error("batch HTTP ${res.code}: $resBody")
            // Contrato IngestResponse: { accepted, duplicateBatch, trip: { status, stopTracking } }.
            runCatching {
                JSONObject(resBody).getJSONObject("trip").optBoolean("stopTracking", false)
            }.getOrDefault(false)
        }
    }

    /**
     * Cierre del operador (4.2). Idempotente por `closeRequestId`. Devuelve true si el viaje
     * quedó cerrado: 200 (lo cerró este request) o 409 TRIP_ALREADY_CONCLUDED (otro actor lo
     * cerró antes — para la app también significa "ya está cerrado, deja de rastrear").
     */
    suspend fun closeTrip(
        tripId: String,
        tripToken: String,
        closeRequestId: String,
        requestedAt: String,
        observations: String,
    ): Boolean = withContext(Dispatchers.IO) {
        val payload = JSONObject()
            .put("observations", observations)
            .put("requestedAt", requestedAt)
            .put("closeRequestId", closeRequestId)
            .toString()
        val req = Request.Builder()
            .url("$base/api/mobile/trips/$tripId/close")
            .header("Authorization", "Bearer $tripToken")
            .post(payload.toRequestBody(JSON))
            .build()
        client.newCall(req).execute().use { res ->
            val body = res.body?.string().orEmpty()
            if (res.isSuccessful) return@withContext true
            if (res.code == 409 && body.contains("TRIP_ALREADY_CONCLUDED")) return@withContext true
            error("close HTTP ${res.code}: $body")
        }
    }

    private fun gzip(bytes: ByteArray): ByteArray {
        val out = java.io.ByteArrayOutputStream()
        java.util.zip.GZIPOutputStream(out).use { it.write(bytes) }
        return out.toByteArray()
    }
}
