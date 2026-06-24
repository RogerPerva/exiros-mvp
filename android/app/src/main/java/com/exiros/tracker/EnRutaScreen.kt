package com.exiros.tracker

import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.outlined.Bolt
import androidx.compose.material.icons.outlined.Flag
import androidx.compose.material.icons.outlined.Place
import androidx.compose.material.icons.outlined.Schedule
import androidx.compose.material.icons.outlined.Sync
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.HorizontalDivider
import androidx.compose.material3.Icon
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.exiros.tracker.data.ActiveTripEntity
import com.exiros.tracker.data.TripRepository
import com.exiros.tracker.sync.SyncScheduler
import com.exiros.tracker.ui.BorderGray
import com.exiros.tracker.ui.ExirosBlue
import com.exiros.tracker.ui.ExirosError
import com.exiros.tracker.ui.ExirosNavy
import com.exiros.tracker.ui.Success
import com.exiros.tracker.ui.SurfaceWhite
import com.exiros.tracker.ui.TextPrimary
import com.exiros.tracker.ui.TextSecondary
import com.exiros.tracker.ui.Warning
import kotlinx.coroutines.launch
import java.text.SimpleDateFormat
import java.util.Date
import java.util.Locale

private val cardShape = RoundedCornerShape(14.dp)
private val pillShape = RoundedCornerShape(50)
private val esMX = Locale("es", "MX")
// "08:15 a. m. · 22/05/2025" (hora de inicio, con cero a la izquierda).
private val startFmt = SimpleDateFormat("hh:mm a · dd/MM/yyyy", esMX)
// "9:39 a. m." (último envío, sin cero a la izquierda, como la referencia).
private val sentFmt = SimpleDateFormat("h:mm a", esMX)

/**
 * M3 "Viaje activo": estado restaurado desde Room. La captura de fixes la hace el
 * TrackingService (3.2), que sobrevive en 2º plano; esta pantalla solo observa Room
 * y refleja al operador qué se está rastreando y si la cola va al día.
 */
@Composable
fun EnRutaScreen(
    trip: ActiveTripEntity,
    repo: TripRepository,
    hasLocationPermission: Boolean,
    onRequestPermission: () -> Unit,
    onFinalize: () -> Unit,
) {
    val context = LocalContext.current
    val scope = rememberCoroutineScope()

    val unsent by repo.unsentCount(trip.tripId).collectAsState(initial = 0)
    val lastSentAt by repo.lastSentAt(trip.tripId).collectAsState(initial = null)
    var note by remember { mutableStateOf<String?>(null) }

    Column(
        modifier = Modifier
            .fillMaxSize()
            .padding(20.dp),
        verticalArrangement = Arrangement.spacedBy(16.dp),
    ) {
        ExirosWordmark()

        // Píldora de estado: punto + "En ruta · rastreando".
        Surface(shape = pillShape, color = Success.copy(alpha = 0.12f)) {
            Row(
                modifier = Modifier.padding(horizontal = 14.dp, vertical = 7.dp),
                verticalAlignment = Alignment.CenterVertically,
            ) {
                Box(Modifier.size(8.dp).background(Success, CircleShape))
                Spacer(Modifier.width(8.dp))
                Text("En ruta · rastreando", color = Success, fontSize = 13.sp, fontWeight = FontWeight.SemiBold)
            }
        }

        Column {
            Text("Viaje activo", color = ExirosNavy, fontSize = 26.sp, fontWeight = FontWeight.Bold)
            Text(
                "Tu ubicación se está registrando automáticamente.",
                color = TextSecondary,
                fontSize = 14.sp,
            )
        }

        // Tarjeta con destino, hora de inicio y estado de sincronización.
        Surface(shape = cardShape, color = SurfaceWhite, border = BorderStroke(1.dp, BorderGray)) {
            Column(modifier = Modifier.padding(16.dp), verticalArrangement = Arrangement.spacedBy(14.dp)) {
                DataRow(Icons.Outlined.Place, "Destino", trip.destinationName, ExirosBlue, TextPrimary)
                HorizontalDivider(color = BorderGray)
                DataRow(
                    Icons.Outlined.Schedule,
                    "Hora de inicio",
                    startFmt.format(Date(trip.createdAt)),
                    ExirosBlue,
                    TextPrimary,
                )
                HorizontalDivider(color = BorderGray)
                val (syncText, syncColor) = syncStatus(unsent, lastSentAt)
                DataRow(Icons.Outlined.Sync, "Sincronización", syncText, syncColor, syncColor)
            }
        }

        // Banner de permiso si falta (sin él no se rastrea).
        if (!hasLocationPermission) {
            Surface(shape = cardShape, color = Color(0xFFFFF4F4), border = BorderStroke(1.dp, ExirosError)) {
                Column(modifier = Modifier.padding(16.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
                    Text(
                        "Falta permiso de ubicación: sin él no se rastrea la ruta.",
                        color = ExirosError,
                        fontSize = 14.sp,
                    )
                    Button(
                        onClick = onRequestPermission,
                        shape = cardShape,
                        colors = ButtonDefaults.buttonColors(containerColor = ExirosBlue),
                    ) { Text("Permitir ubicación") }
                }
            }
        }

        // Nota de modo ahorro (la app envía puntos según el movimiento del camión).
        Surface(shape = cardShape, color = Color(0xFFEFF2F7)) {
            Row(modifier = Modifier.padding(14.dp), verticalAlignment = Alignment.CenterVertically) {
                Icon(Icons.Outlined.Bolt, contentDescription = null, tint = ExirosBlue, modifier = Modifier.size(20.dp))
                Spacer(Modifier.width(12.dp))
                Text(
                    "Modo ahorro: solo enviamos puntos cuando el camión se mueve.",
                    color = TextPrimary,
                    fontSize = 13.sp,
                )
            }
        }

        note?.let { Text(it, color = TextSecondary, fontSize = 13.sp) }

        Spacer(Modifier.weight(1f))

        // Finalizar viaje (M4). Si ya se pidió el cierre, se está enviando al backend.
        if (trip.pendingClose) {
            Text("Finalizando viaje…", color = ExirosBlue, fontSize = 14.sp, fontWeight = FontWeight.Medium)
        } else {
            OutlinedButton(
                onClick = onFinalize,
                shape = cardShape,
                border = BorderStroke(1.5.dp, ExirosNavy),
                colors = ButtonDefaults.outlinedButtonColors(contentColor = ExirosNavy),
                modifier = Modifier.fillMaxWidth().height(56.dp),
            ) {
                Icon(Icons.Outlined.Flag, contentDescription = null, modifier = Modifier.size(20.dp))
                Spacer(Modifier.width(10.dp))
                Text("Finalizar viaje", fontSize = 16.sp, fontWeight = FontWeight.SemiBold)
            }
        }

        // Afordancias de desarrollo (apagadas en demo/producción; ver BuildConfig.DEV_AIDS).
        if (BuildConfig.DEV_AIDS) {
            OutlinedButton(
                onClick = {
                    SyncScheduler.syncNow(context)
                    note = "Sync encolado (WorkManager enviará el lote GZIP)"
                },
                shape = cardShape,
                modifier = Modifier.fillMaxWidth(),
            ) { Text("Sincronizar ahora (debug)") }

            OutlinedButton(
                onClick = { scope.launch { repo.endTrip() } },
                shape = cardShape,
                modifier = Modifier.fillMaxWidth(),
            ) { Text("Olvidar viaje — solo local (debug)") }
        }
    }
}

/** Texto + color de la fila "Sincronización" según la cola local. */
private fun syncStatus(unsent: Int, lastSentAt: Long?): Pair<String, Color> = when {
    unsent > 0 -> "$unsent ${if (unsent == 1) "punto" else "puntos"} por enviar…" to Warning
    lastSentAt != null -> "Al día · último envío ${sentFmt.format(Date(lastSentAt))}" to Success
    else -> "Esperando el primer envío…" to TextSecondary
}

@Composable
private fun DataRow(icon: ImageVector, label: String, value: String, iconTint: Color, valueColor: Color) {
    Row(verticalAlignment = Alignment.CenterVertically) {
        Icon(icon, contentDescription = null, tint = iconTint, modifier = Modifier.size(22.dp))
        Spacer(Modifier.width(12.dp))
        Column {
            Text(label, color = TextSecondary, fontSize = 13.sp)
            Text(value, color = valueColor, fontSize = 16.sp, fontWeight = FontWeight.Bold)
        }
    }
}
