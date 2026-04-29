package com.danieldsilva.pace

import android.content.Intent
import android.util.Log
import androidx.activity.result.ActivityResult
import androidx.health.connect.client.HealthConnectClient
import androidx.health.connect.client.PermissionController
import androidx.health.connect.client.permission.HealthPermission
import androidx.health.connect.client.records.StepsRecord
import androidx.health.connect.client.records.WeightRecord
import androidx.health.connect.client.request.ReadRecordsRequest
import androidx.health.connect.client.time.TimeRangeFilter
import com.getcapacitor.JSObject
import com.getcapacitor.Plugin
import com.getcapacitor.PluginCall
import com.getcapacitor.PluginMethod
import com.getcapacitor.annotation.ActivityCallback
import com.getcapacitor.annotation.CapacitorPlugin
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch
import java.time.Instant
import java.time.LocalDate
import java.time.ZoneId

@CapacitorPlugin(name = "HealthConnect")
class HealthConnectPlugin : Plugin() {

    private val permissions = setOf(
        HealthPermission.getReadPermission(StepsRecord::class),
        HealthPermission.getReadPermission(WeightRecord::class)
    )

    private fun clientOrNull(): HealthConnectClient? {
        val status = HealthConnectClient.getSdkStatus(context)
        if (status != HealthConnectClient.SDK_AVAILABLE) return null
        return HealthConnectClient.getOrCreate(context)
    }

    @PluginMethod
    fun isAvailable(call: PluginCall) {
        val status = HealthConnectClient.getSdkStatus(context)
        Log.i("HealthConnectPlugin", "getSdkStatus returned $status (AVAILABLE=${HealthConnectClient.SDK_AVAILABLE}, UNAVAILABLE=${HealthConnectClient.SDK_UNAVAILABLE}, UPDATE_REQUIRED=${HealthConnectClient.SDK_UNAVAILABLE_PROVIDER_UPDATE_REQUIRED})")
        val ret = JSObject()
        ret.put("available", status == HealthConnectClient.SDK_AVAILABLE)
        ret.put(
            "status",
            when (status) {
                HealthConnectClient.SDK_AVAILABLE -> "available"
                HealthConnectClient.SDK_UNAVAILABLE -> "unavailable"
                HealthConnectClient.SDK_UNAVAILABLE_PROVIDER_UPDATE_REQUIRED -> "update-required"
                else -> "unknown"
            }
        )
        call.resolve(ret)
    }

    @PluginMethod
    fun hasPermissions(call: PluginCall) {
        val client = clientOrNull()
        if (client == null) {
            val ret = JSObject()
            ret.put("granted", false)
            call.resolve(ret)
            return
        }
        CoroutineScope(Dispatchers.Main).launch {
            try {
                val granted = client.permissionController.getGrantedPermissions()
                val ret = JSObject()
                ret.put("granted", granted.containsAll(permissions))
                call.resolve(ret)
            } catch (e: Exception) {
                call.reject(e.message ?: "Failed to read Health Connect permissions", e)
            }
        }
    }

    @PluginMethod
    fun requestHealthPermissions(call: PluginCall) {
        Log.i("HealthConnectPlugin", "requestHealthPermissions called")
        if (clientOrNull() == null) {
            call.reject("Health Connect not available (provider missing)")
            return
        }
        try {
            val intent = PermissionController.createRequestPermissionResultContract()
                .createIntent(context, permissions)
            Log.i("HealthConnectPlugin", "Launching permission intent: $intent")
            startActivityForResult(call, intent, "permissionResult")
        } catch (e: Exception) {
            Log.e("HealthConnectPlugin", "Permission intent failed, opening settings", e)
            try {
                val fallback = Intent("androidx.health.ACTION_HEALTH_CONNECT_SETTINGS")
                fallback.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
                context.startActivity(fallback)
                val ret = JSObject()
                ret.put("granted", false)
                ret.put("opened", "settings")
                call.resolve(ret)
            } catch (e2: Exception) {
                call.reject("Could not launch Health Connect: ${e.message}", e)
            }
        }
    }

    @ActivityCallback
    fun permissionResult(call: PluginCall, result: ActivityResult) {
        val client = clientOrNull()
        if (client == null) {
            call.reject("Health Connect is not available on this device")
            return
        }
        CoroutineScope(Dispatchers.Main).launch {
            try {
                val granted = client.permissionController.getGrantedPermissions()
                val ret = JSObject()
                ret.put("granted", granted.containsAll(permissions))
                call.resolve(ret)
            } catch (e: Exception) {
                call.reject(e.message ?: "Failed to confirm Health Connect permissions", e)
            }
        }
    }

    @PluginMethod
    fun readStepsToday(call: PluginCall) {
        val client = clientOrNull()
        if (client == null) {
            call.reject("Health Connect is not available on this device")
            return
        }
        val zone = ZoneId.systemDefault()
        val startOfDay = LocalDate.now(zone).atStartOfDay(zone).toInstant()
        val now = Instant.now()
        CoroutineScope(Dispatchers.Main).launch {
            try {
                val response = client.readRecords(
                    ReadRecordsRequest(
                        recordType = StepsRecord::class,
                        timeRangeFilter = TimeRangeFilter.between(startOfDay, now)
                    )
                )
                val total = response.records.sumOf { it.count }
                val ret = JSObject()
                ret.put("steps", total)
                call.resolve(ret)
            } catch (e: Exception) {
                call.reject(e.message ?: "Failed to read steps", e)
            }
        }
    }

    @PluginMethod
    fun readLatestWeight(call: PluginCall) {
        val client = clientOrNull()
        if (client == null) {
            call.reject("Health Connect is not available on this device")
            return
        }
        val now = Instant.now()
        val thirtyDaysAgo = now.minusSeconds(30L * 24 * 60 * 60)
        CoroutineScope(Dispatchers.Main).launch {
            try {
                val response = client.readRecords(
                    ReadRecordsRequest(
                        recordType = WeightRecord::class,
                        timeRangeFilter = TimeRangeFilter.between(thirtyDaysAgo, now)
                    )
                )
                val latest = response.records.maxByOrNull { it.time }
                val ret = JSObject()
                if (latest != null) {
                    ret.put("weightKg", latest.weight.inKilograms)
                    ret.put("recordedAt", latest.time.toString())
                } else {
                    ret.put("weightKg", JSObject.NULL)
                }
                call.resolve(ret)
            } catch (e: Exception) {
                call.reject(e.message ?: "Failed to read weight", e)
            }
        }
    }
}
