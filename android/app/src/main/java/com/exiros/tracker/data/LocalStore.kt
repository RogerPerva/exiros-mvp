package com.exiros.tracker.data

import android.content.Context
import androidx.room.Dao
import androidx.room.Database
import androidx.room.Entity
import androidx.room.Insert
import androidx.room.OnConflictStrategy
import androidx.room.PrimaryKey
import androidx.room.Query
import androidx.room.Room
import androidx.room.RoomDatabase
import kotlinx.coroutines.flow.Flow

/**
 * Estado completo del viaje activo (fila única, id = 1). Sobrevive al cierre del proceso:
 * al reabrir, si existe esta fila la app restaura M3 sin re-crear el viaje.
 * Guarda el `tripToken` (autoriza la ingesta) y el snapshot inmutable de la geocerca del
 * destino (centro+radio) para que 4.1 pueda anticipar la llegada sin re-consultar.
 */
@Entity(tableName = "active_trip")
data class ActiveTripEntity(
    @PrimaryKey val id: Int = SINGLETON_ID,
    val tripId: String,
    val tripToken: String,
    val status: String,
    val destinationName: String,
    val centerLat: Double,
    val centerLng: Double,
    val radiusMeters: Double,
    val providerName: String,
    val folio: String,
    // Cierre del operador (4.2): se encola localmente y el SyncWorker lo manda con idempotencia.
    val pendingClose: Boolean = false,
    val closeRequestId: String? = null,
    val closeRequestedAt: Long? = null,
    val closeObservations: String? = null,
    /** Motivo del cierre (AUTO_GEOFENCE / MANUAL_OPERATOR / MANUAL_ADMIN); null mientras EN_RUTA. */
    val closureType: String? = null,
    /** Momento del cierre (ms). Con `createdAt` deriva la duración mostrada en M5; null mientras EN_RUTA. */
    val closedAt: Long? = null,
    val createdAt: Long,
) {
    companion object {
        const val SINGLETON_ID = 1
    }
}

/**
 * Punto capturado por FusedLocation, encolado localmente. `sent=false` hasta que 3.3 lo
 * suba por lotes; `accuracyMeters` decide más tarde la elegibilidad para geocerca (3.4/4.1).
 */
@Entity(tableName = "location_queue")
data class LocationEntity(
    @PrimaryKey(autoGenerate = true) val id: Long = 0,
    val tripId: String,
    val lat: Double,
    val lng: Double,
    val accuracyMeters: Double,
    val recordedAt: Long,
    val sent: Boolean = false,
)

@Dao
interface TripDao {
    // id fijo = ActiveTripEntity.SINGLETON_ID (1). Literal porque las anotaciones exigen
    // constante de compilación y un string-template no lo es.
    @Query("SELECT * FROM active_trip WHERE id = 1 LIMIT 1")
    fun observeActiveTrip(): Flow<ActiveTripEntity?>

    @Query("SELECT * FROM active_trip WHERE id = 1 LIMIT 1")
    suspend fun getActiveTrip(): ActiveTripEntity?

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun upsertActiveTrip(trip: ActiveTripEntity)

    @Query("DELETE FROM active_trip")
    suspend fun clearActiveTrip()

    @Query(
        "UPDATE active_trip SET pendingClose = 1, closeRequestId = :rid, " +
            "closeRequestedAt = :at, closeObservations = :obs WHERE id = 1",
    )
    suspend fun setPendingClose(rid: String, at: Long, obs: String)

    @Query(
        "UPDATE active_trip SET status = 'CONCLUIDO', pendingClose = 0, " +
            "closureType = :closureType, closedAt = :closedAt WHERE id = 1",
    )
    suspend fun markConcluded(closureType: String?, closedAt: Long)

    @Insert
    suspend fun insertLocation(point: LocationEntity)

    @Query("SELECT COUNT(*) FROM location_queue WHERE tripId = :tripId")
    fun observeLocationCount(tripId: String): Flow<Int>

    @Query("SELECT * FROM location_queue WHERE tripId = :tripId ORDER BY recordedAt DESC, id DESC LIMIT 1")
    fun observeLastLocation(tripId: String): Flow<LocationEntity?>

    // Puntos aún sin subir: 0 = la cola está "al día"; >0 = hay envíos pendientes.
    @Query("SELECT COUNT(*) FROM location_queue WHERE tripId = :tripId AND sent = 0")
    fun observeUnsentCount(tripId: String): Flow<Int>

    // Hora del último punto confirmado como enviado (proxy de "último envío"); null si aún no sube ninguno.
    @Query("SELECT MAX(recordedAt) FROM location_queue WHERE tripId = :tripId AND sent = 1")
    fun observeLastSentAt(tripId: String): Flow<Long?>

    // recordedAt + id: orden estable del lote (y de la ruta) ante empates de timestamp.
    @Query("SELECT * FROM location_queue WHERE tripId = :tripId AND sent = 0 ORDER BY recordedAt ASC, id ASC")
    suspend fun unsentLocations(tripId: String): List<LocationEntity>

    @Query("UPDATE location_queue SET sent = 1 WHERE id IN (:ids)")
    suspend fun markSent(ids: List<Long>)
}

@Database(entities = [ActiveTripEntity::class, LocationEntity::class], version = 4, exportSchema = false)
abstract class AppDatabase : RoomDatabase() {
    abstract fun tripDao(): TripDao

    companion object {
        @Volatile private var instance: AppDatabase? = null

        fun get(context: Context): AppDatabase = instance ?: synchronized(this) {
            instance ?: Room.databaseBuilder(
                context.applicationContext,
                AppDatabase::class.java,
                "exiros-tracker.db",
            )
                // MVP: el esquema local es caché; recrearlo en upgrade es aceptable (el viaje
                // también vive en el backend). Si en producción importara, añadir Migration 1→2.
                .fallbackToDestructiveMigration()
                .build().also { instance = it }
        }
    }
}
