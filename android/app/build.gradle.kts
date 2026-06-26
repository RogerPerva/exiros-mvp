import java.util.Properties

plugins {
    id("com.android.application")
    id("org.jetbrains.kotlin.android")
    id("org.jetbrains.kotlin.plugin.compose")
    id("com.google.devtools.ksp")
}

// Credenciales de firma release desde android/keystore.properties (GITIGNORED).
// Si el archivo no existe (CI, otra máquina), el release queda sin firmar y se avisa.
val keystoreProps = Properties().apply {
    val f = rootProject.file("keystore.properties")
    if (f.exists()) f.inputStream().use { load(it) }
}

android {
    namespace = "com.exiros.tracker"
    compileSdk = 34

    signingConfigs {
        if (keystoreProps.isNotEmpty()) {
            create("release") {
                storeFile = file(keystoreProps.getProperty("storeFile"))
                storePassword = keystoreProps.getProperty("storePassword")
                keyAlias = keystoreProps.getProperty("keyAlias")
                keyPassword = keystoreProps.getProperty("keyPassword")
            }
        }
    }

    defaultConfig {
        applicationId = "com.exiros.tracker"
        minSdk = 26
        targetSdk = 34
        versionCode = 1
        versionName = "0.1"
    }

    buildTypes {
        debug {
            // 10.0.2.2 = host de la máquina anfitriona visto desde el emulador Android.
            buildConfigField("String", "API_BASE_URL", "\"http://10.0.2.2:3000\"")
            buildConfigField("String", "APP_KEY", "\"dev-app-key-cambia-en-prod\"")
            // Ayudas de desarrollo (prefill del formulario, foto de muestra, botones de prueba).
            // APAGADAS por defecto para que la demo se vea como producción; reactívalas con
            // `-PEXIROS_DEV_AIDS=true` al ensamblar el debug.
            val devAids = (project.findProperty("EXIROS_DEV_AIDS") as String?)?.toBoolean() ?: false
            buildConfigField("Boolean", "DEV_AIDS", "$devAids")
            // Modo demo: captura+envío cada N seg (en vez de lotes 15 min) para VER el camión
            // moverse en vivo. 0 = producción (sin cambio). Activar con `-PEXIROS_DEMO_SECONDS=15`.
            val demoSec = (project.findProperty("EXIROS_DEMO_SECONDS") as String?)?.toIntOrNull() ?: 0
            buildConfigField("int", "DEMO_TRACKING_SECONDS", "$demoSec")
        }
        release {
            isMinifyEnabled = false
            // Firma con el keystore real si keystore.properties está presente.
            signingConfig = signingConfigs.findByName("release")
            // Config de producción por -P (gradle.properties / línea de comandos). Sin override
            // quedan los placeholders dev; el guard de abajo impide ensamblar un release con ellos.
            val apiUrl = (project.findProperty("EXIROS_API_URL") as String?)
                ?: "http://10.0.2.2:3000"
            val appKey = (project.findProperty("EXIROS_APP_KEY") as String?)
                ?: "dev-app-key-cambia-en-prod"
            buildConfigField("String", "API_BASE_URL", "\"$apiUrl\"")
            buildConfigField("String", "APP_KEY", "\"$appKey\"")
            // Las ayudas de desarrollo nunca existen en producción.
            buildConfigField("Boolean", "DEV_AIDS", "false")
            // Modo demo (ver debug). 0 = producción; para una demo en release: `-PEXIROS_DEMO_SECONDS=15`.
            val demoSec = (project.findProperty("EXIROS_DEMO_SECONDS") as String?)?.toIntOrNull() ?: 0
            buildConfigField("int", "DEMO_TRACKING_SECONDS", "$demoSec")
        }
    }

    compileOptions {
        sourceCompatibility = JavaVersion.VERSION_17
        targetCompatibility = JavaVersion.VERSION_17
    }
    kotlinOptions {
        jvmTarget = "17"
    }
    buildFeatures {
        compose = true
        buildConfig = true
    }
}

// Falla el build release si quedaron los placeholders de desarrollo (evita publicar un APK
// apuntando al emulador con la app-key de dev). El build debug no se ve afectado.
gradle.taskGraph.whenReady {
    val releasing = allTasks.any { it.name == "assembleRelease" || it.name == "bundleRelease" }
    if (releasing) {
        val apiUrl = project.findProperty("EXIROS_API_URL") as String?
        val appKey = project.findProperty("EXIROS_APP_KEY") as String?
        if (apiUrl == null || appKey == null ||
            apiUrl.contains("10.0.2.2") || appKey.contains("cambia-en-prod")
        ) {
            throw GradleException(
                "Build release con configuración dev. Define -PEXIROS_API_URL=<url> y " +
                    "-PEXIROS_APP_KEY=<key> reales (sin placeholders).",
            )
        }
    }
}

dependencies {
    implementation("androidx.core:core-ktx:1.13.1")
    implementation("androidx.lifecycle:lifecycle-runtime-ktx:2.8.7")
    implementation("androidx.activity:activity-compose:1.9.3")

    val composeBom = platform("androidx.compose:compose-bom:2024.10.01")
    implementation(composeBom)
    implementation("androidx.compose.ui:ui")
    implementation("androidx.compose.ui:ui-graphics")
    implementation("androidx.compose.material3:material3")
    implementation("androidx.compose.material:material-icons-extended")
    debugImplementation("androidx.compose.ui:ui-tooling")
    implementation("androidx.compose.ui:ui-tooling-preview")

    implementation("org.jetbrains.kotlinx:kotlinx-coroutines-android:1.9.0")
    implementation("com.squareup.okhttp3:okhttp:4.12.0")
    implementation("io.coil-kt:coil-compose:2.7.0")

    // Room: cola local de puntos + estado del viaje activo (persistencia que sobrevive reinicio).
    implementation("androidx.room:room-runtime:2.6.1")
    implementation("androidx.room:room-ktx:2.6.1")
    ksp("androidx.room:room-compiler:2.6.1")

    // FusedLocation: fija ubicación fusionando GPS+WiFi+celular, con accuracyMeters por fix.
    implementation("com.google.android.gms:play-services-location:21.3.0")

    // WorkManager: envío diferido por lotes (3.3), con reintentos + constraint de red.
    implementation("androidx.work:work-runtime-ktx:2.9.1")
}
