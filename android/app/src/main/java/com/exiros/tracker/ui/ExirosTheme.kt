package com.exiros.tracker.ui

import androidx.compose.foundation.isSystemInDarkTheme
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.lightColorScheme
import androidx.compose.runtime.Composable
import androidx.compose.ui.graphics.Color

// Paleta Exiros (docs/exiros-reference-image/documentacion UX-UI.md §2.1).
val ExirosBlue = Color(0xFF0D479C)
val ExirosNavy = Color(0xFF0B1F3D)
val Graphite = Color(0xFF464747)
val LightBlue = Color(0xFF94ACD1)
val BorderGray = Color(0xFFD4D8E0)
val BgGeneral = Color(0xFFF8FAFC)
val SurfaceWhite = Color(0xFFFFFFFF)
val TextPrimary = Color(0xFF111827)
val TextSecondary = Color(0xFF7A828F)
val Success = Color(0xFF16A34A)
val ExirosError = Color(0xFFDC2626)

private val ExirosColors = lightColorScheme(
    primary = ExirosBlue,
    onPrimary = Color.White,
    background = BgGeneral,
    onBackground = TextPrimary,
    surface = SurfaceWhite,
    onSurface = TextPrimary,
    surfaceVariant = SurfaceWhite,
    onSurfaceVariant = TextSecondary,
    outline = BorderGray,
    error = ExirosError,
    onError = Color.White,
)

/** Tema corporativo Exiros. Roboto es la fuente del sistema Android (no requiere setup). */
@Composable
fun ExirosTheme(content: @Composable () -> Unit) {
    // El doc descarta modo oscuro: forzamos el esquema claro siempre.
    @Suppress("UNUSED_EXPRESSION")
    isSystemInDarkTheme()
    MaterialTheme(colorScheme = ExirosColors, content = content)
}
