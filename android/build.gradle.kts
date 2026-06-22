plugins {
    id("com.android.application") version "8.7.2" apply false
    id("org.jetbrains.kotlin.android") version "2.0.21" apply false
    id("org.jetbrains.kotlin.plugin.compose") version "2.0.21" apply false
    // KSP atado a Kotlin 2.0.21 (procesa anotaciones de Room). La versión debe casar con el Kotlin del proyecto.
    id("com.google.devtools.ksp") version "2.0.21-1.0.28" apply false
}
