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
import androidx.compose.material.icons.filled.Add
import androidx.compose.material.icons.filled.CheckCircle
import androidx.compose.material.icons.outlined.Description
import androidx.compose.material.icons.outlined.Schedule
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.HorizontalDivider
import androidx.compose.material3.Icon
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.exiros.tracker.data.ActiveTripEntity
import com.exiros.tracker.ui.BorderGray
import com.exiros.tracker.ui.ExirosBlue
import com.exiros.tracker.ui.ExirosNavy
import com.exiros.tracker.ui.SurfaceWhite
import com.exiros.tracker.ui.TextPrimary
import com.exiros.tracker.ui.TextSecondary
import com.exiros.tracker.ui.exirosFieldColors

private val shape = RoundedCornerShape(12.dp)

/** M4 — Finalizar viaje (cierre por operador, CU-05). Observación obligatoria. */
@Composable
fun FinalizarScreen(onCancel: () -> Unit, onConfirm: (observations: String) -> Unit) {
    var observations by remember { mutableStateOf("") }
    Column(
        modifier = Modifier.fillMaxSize().padding(20.dp),
        verticalArrangement = Arrangement.spacedBy(14.dp),
    ) {
        ExirosWordmark()
        Text("Finalizar viaje", color = ExirosNavy, fontSize = 20.sp, fontWeight = FontWeight.Bold)
        Text(
            "Escribe una observación del cierre. El viaje quedará concluido y el rastreo se detendrá.",
            color = TextSecondary,
            fontSize = 14.sp,
        )
        OutlinedTextField(
            value = observations,
            onValueChange = { observations = it },
            label = { Text("Observaciones") },
            minLines = 3,
            shape = shape,
            modifier = Modifier.fillMaxWidth(),
            colors = exirosFieldColors(),
        )
        Button(
            onClick = { onConfirm(observations.trim()) },
            enabled = observations.isNotBlank(),
            shape = shape,
            colors = ButtonDefaults.buttonColors(containerColor = ExirosBlue),
            modifier = Modifier.fillMaxWidth().height(52.dp),
        ) { Text("Confirmar finalización", fontWeight = FontWeight.SemiBold) }
        OutlinedButton(onClick = onCancel, shape = shape, modifier = Modifier.fillMaxWidth()) {
            Text("Cancelar")
        }
    }
}

/** Etiqueta corta del motivo de cierre para la fila "Tipo de cierre" en M5. */
private fun closureShort(closureType: String?): String = when (closureType) {
    "AUTO_GEOFENCE" -> "Automático por geocerca"
    "MANUAL_OPERATOR" -> "Manual por operador"
    "MANUAL_ADMIN" -> "Manual por administrador"
    else -> "—"
}

/** Subtítulo de confirmación según cómo se cerró el viaje (M5). */
private fun closureSubtitle(closureType: String?): String = when (closureType) {
    "AUTO_GEOFENCE" -> "El viaje se cerró al llegar al destino. El rastreo se detuvo."
    "MANUAL_OPERATOR" -> "Cerraste el viaje manualmente. El rastreo se detuvo."
    "MANUAL_ADMIN" -> "Un administrador cerró el viaje. El rastreo se detuvo."
    else -> "El viaje concluyó. El rastreo se detuvo."
}

/** "02:48 h" a partir de la duración del viaje (cierre − inicio); "—" si no hay hora de cierre. */
private fun formatDuration(startMs: Long, endMs: Long?): String {
    if (endMs == null || endMs <= startMs) return "—"
    val totalMin = (endMs - startMs) / 60_000
    val hh = (totalMin / 60).toString().padStart(2, '0')
    val mm = (totalMin % 60).toString().padStart(2, '0')
    return "$hh:$mm h"
}

/** M5 — Viaje concluido. Resumen del cierre (tipo, observaciones, duración) + nuevo viaje. */
@Composable
fun ConcluidoScreen(trip: ActiveTripEntity, onNewTrip: () -> Unit) {
    Column(
        modifier = Modifier.fillMaxSize().padding(20.dp),
        verticalArrangement = Arrangement.spacedBy(16.dp),
        horizontalAlignment = Alignment.CenterHorizontally,
    ) {
        Spacer(Modifier.height(40.dp))
        // Check en círculo azul claro (acento corporativo, no verde) — fiel a la referencia M5.
        Box(
            modifier = Modifier.size(96.dp).background(Color(0xFFE8EFFB), CircleShape),
            contentAlignment = Alignment.Center,
        ) {
            Icon(
                Icons.Filled.CheckCircle,
                contentDescription = null,
                tint = ExirosBlue,
                modifier = Modifier.size(56.dp),
            )
        }
        Text("Viaje concluido", color = ExirosNavy, fontSize = 22.sp, fontWeight = FontWeight.Bold)
        Text(
            closureSubtitle(trip.closureType),
            color = TextSecondary,
            fontSize = 14.sp,
            textAlign = TextAlign.Center,
        )

        // Tarjeta-resumen del cierre.
        Surface(
            shape = RoundedCornerShape(14.dp),
            color = SurfaceWhite,
            border = BorderStroke(1.dp, BorderGray),
            modifier = Modifier.fillMaxWidth(),
        ) {
            Column(
                modifier = Modifier.padding(16.dp),
                verticalArrangement = Arrangement.spacedBy(14.dp),
            ) {
                SummaryRow(Icons.Filled.CheckCircle, "Tipo de cierre", closureShort(trip.closureType))
                HorizontalDivider(color = BorderGray)
                SummaryRow(
                    Icons.Outlined.Description,
                    "Observaciones",
                    trip.closeObservations?.ifBlank { null } ?: "—",
                )
                HorizontalDivider(color = BorderGray)
                SummaryRow(Icons.Outlined.Schedule, "Duración", formatDuration(trip.createdAt, trip.closedAt))
            }
        }

        Spacer(Modifier.weight(1f))

        Button(
            onClick = onNewTrip,
            shape = shape,
            colors = ButtonDefaults.buttonColors(containerColor = ExirosBlue),
            modifier = Modifier.fillMaxWidth().height(52.dp),
        ) {
            Icon(Icons.Filled.Add, contentDescription = null, modifier = Modifier.size(20.dp))
            Spacer(Modifier.width(8.dp))
            Text("Iniciar nuevo viaje", fontWeight = FontWeight.SemiBold)
        }
    }
}

/** Fila de la tarjeta-resumen de M5: icono + (label gris arriba, valor en negrita abajo). */
@Composable
private fun SummaryRow(icon: ImageVector, label: String, value: String) {
    Row(verticalAlignment = Alignment.CenterVertically) {
        Icon(icon, contentDescription = null, tint = ExirosBlue, modifier = Modifier.size(22.dp))
        Spacer(Modifier.width(12.dp))
        Column {
            Text(label, color = TextSecondary, fontSize = 13.sp)
            Text(value, color = TextPrimary, fontSize = 16.sp, fontWeight = FontWeight.Bold)
        }
    }
}
