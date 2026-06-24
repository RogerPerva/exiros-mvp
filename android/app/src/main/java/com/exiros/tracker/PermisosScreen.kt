package com.exiros.tracker

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
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.outlined.DirectionsWalk
import androidx.compose.material.icons.outlined.Map
import androidx.compose.material.icons.outlined.MyLocation
import androidx.compose.material.icons.outlined.Notifications
import androidx.compose.material.icons.outlined.Place
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.HorizontalDivider
import androidx.compose.material3.Icon
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.exiros.tracker.ui.BorderGray
import com.exiros.tracker.ui.ExirosBlue
import com.exiros.tracker.ui.ExirosNavy
import com.exiros.tracker.ui.TextPrimary
import com.exiros.tracker.ui.TextSecondary

/**
 * M1 — Pantalla de permisos (rationale). Explica POR QUÉ la app necesita cada permiso ANTES de
 * lanzar el diálogo del sistema, para subir la tasa de aceptación. "Permitir y continuar" lanza
 * la solicitud real; "Ahora no" deja pasar a M2 (el banner rojo de M3 cubre el caso sin permiso).
 */
@Composable
fun PermisosScreen(onAllow: () -> Unit, onSkip: () -> Unit) {
    Column(
        modifier = Modifier.fillMaxSize().padding(24.dp),
    ) {
        Spacer(Modifier.height(8.dp))
        Box(
            modifier = Modifier.size(56.dp).background(Color(0xFFE8EFFB), RoundedCornerShape(14.dp)),
            contentAlignment = Alignment.Center,
        ) {
            Icon(Icons.Outlined.MyLocation, contentDescription = null, tint = ExirosBlue, modifier = Modifier.size(28.dp))
        }
        Spacer(Modifier.height(20.dp))
        Text("Permisos para rastrear el viaje", color = ExirosNavy, fontSize = 24.sp, fontWeight = FontWeight.Bold)
        Spacer(Modifier.height(8.dp))
        Text(
            "Necesitamos estos permisos para registrar la ruta. Cuidamos tu batería: solo " +
                "rastreamos lo necesario mientras el viaje está activo.",
            color = TextSecondary,
            fontSize = 14.sp,
        )
        Spacer(Modifier.height(24.dp))

        PermRow(Icons.Outlined.Place, "Ubicación precisa", "Para ubicar el camión en la ruta.")
        HorizontalDivider(color = BorderGray)
        PermRow(Icons.Outlined.Map, "Ubicación en segundo plano", "Seguir rastreando con la pantalla apagada.")
        HorizontalDivider(color = BorderGray)
        PermRow(Icons.Outlined.Notifications, "Notificaciones", "Avisos del estado del viaje (Android 13+).")
        HorizontalDivider(color = BorderGray)
        PermRow(Icons.Outlined.DirectionsWalk, "Actividad física", "Detectar si el vehículo está en movimiento.")

        Spacer(Modifier.weight(1f))

        Button(
            onClick = onAllow,
            shape = RoundedCornerShape(11.dp),
            colors = ButtonDefaults.buttonColors(containerColor = ExirosBlue),
            modifier = Modifier.fillMaxWidth().height(56.dp),
        ) {
            Text("Permitir y continuar", fontSize = 16.sp, fontWeight = FontWeight.SemiBold)
        }
        TextButton(onClick = onSkip, modifier = Modifier.fillMaxWidth()) {
            Text("Ahora no", color = TextSecondary, fontWeight = FontWeight.Medium)
        }
    }
}

/** Fila de un permiso: icono + nombre (negrita) + justificación corta (gris). */
@Composable
private fun PermRow(icon: ImageVector, name: String, reason: String) {
    Row(
        modifier = Modifier.fillMaxWidth().padding(vertical = 14.dp),
        verticalAlignment = Alignment.CenterVertically,
    ) {
        Icon(icon, contentDescription = null, tint = ExirosBlue, modifier = Modifier.size(24.dp))
        Spacer(Modifier.width(14.dp))
        Column {
            Text(name, color = TextPrimary, fontSize = 15.sp, fontWeight = FontWeight.SemiBold)
            Text(reason, color = TextSecondary, fontSize = 13.sp)
        }
    }
}
