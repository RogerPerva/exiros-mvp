package com.exiros.tracker.data

import android.content.Context
import java.util.UUID

/** deviceId estable por instalación (RN-11: un viaje activo por dispositivo). */
object DeviceId {
    private const val PREFS = "exiros_prefs"
    private const val KEY = "device_id"

    fun get(context: Context): String {
        val prefs = context.getSharedPreferences(PREFS, Context.MODE_PRIVATE)
        return prefs.getString(KEY, null) ?: UUID.randomUUID().toString().also {
            prefs.edit().putString(KEY, it).apply()
        }
    }
}
