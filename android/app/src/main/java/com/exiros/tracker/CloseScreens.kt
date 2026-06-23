package com.exiros.tracker

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.CheckCircle
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.Icon
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.OutlinedTextFieldDefaults
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.exiros.tracker.data.ActiveTripEntity
import com.exiros.tracker.ui.BorderGray
import com.exiros.tracker.ui.ExirosBlue
import com.exiros.tracker.ui.ExirosNavy
import com.exiros.tracker.ui.Success
import com.exiros.tracker.ui.SurfaceWhite
import com.exiros.tracker.ui.TextPrimary
import com.exiros.tracker.ui.TextSecondary

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
            colors = OutlinedTextFieldDefaults.colors(
                focusedContainerColor = SurfaceWhite,
                unfocusedContainerColor = SurfaceWhite,
                focusedBorderColor = ExirosBlue,
                unfocusedBorderColor = BorderGray,
            ),
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

/** Etiqueta legible del motivo de cierre para mostrar al operador en M5. */
private fun closureLabel(closureType: String?): String = when (closureType) {
    "AUTO_GEOFENCE" -> "Cierre automático por geocerca"
    "MANUAL_OPERATOR" -> "Cierre manual por operador"
    "MANUAL_ADMIN" -> "Cierre manual por administrador"
    else -> "Viaje concluido"
}

/** M5 — Viaje concluido. El rastreo ya se detuvo; permite iniciar uno nuevo. */
@Composable
fun ConcluidoScreen(trip: ActiveTripEntity, onNewTrip: () -> Unit) {
    Column(
        modifier = Modifier.fillMaxSize().padding(20.dp),
        verticalArrangement = Arrangement.spacedBy(16.dp),
        horizontalAlignment = Alignment.CenterHorizontally,
    ) {
        Spacer(Modifier.height(48.dp))
        Icon(
            Icons.Filled.CheckCircle,
            contentDescription = null,
            tint = Success,
            modifier = Modifier.size(72.dp),
        )
        Text("Viaje concluido", color = ExirosNavy, fontSize = 22.sp, fontWeight = FontWeight.Bold)
        Text(
            closureLabel(trip.closureType),
            color = Success,
            fontSize = 15.sp,
            fontWeight = FontWeight.SemiBold,
        )
        Text(
            "${trip.providerName} · Folio ${trip.folio}",
            color = TextPrimary,
            fontSize = 15.sp,
        )
        Text("Destino: ${trip.destinationName}", color = TextSecondary, fontSize = 14.sp)
        Spacer(Modifier.height(8.dp))
        Button(
            onClick = onNewTrip,
            shape = shape,
            colors = ButtonDefaults.buttonColors(containerColor = ExirosBlue),
            modifier = Modifier.fillMaxWidth().height(52.dp),
        ) { Text("Iniciar nuevo viaje", fontWeight = FontWeight.SemiBold) }
    }
}
