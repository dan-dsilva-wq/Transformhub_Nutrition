package com.danieldsilva.pace

import android.app.Activity
import android.content.Intent
import android.net.Uri
import android.os.Bundle

/**
 * Launched by Health Connect when the user taps "Privacy policy" inside the
 * permissions screen. Bounces straight out to the hosted policy in a system
 * browser and finishes itself, so the app's main UI is never disturbed.
 */
class PrivacyPolicyActivity : Activity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        val url = getString(R.string.health_connect_privacy_policy_url)
        try {
            val intent = Intent(Intent.ACTION_VIEW, Uri.parse(url))
            intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
            startActivity(intent)
        } catch (_: Exception) {
            /* No browser installed — best effort, just exit. */
        }
        finish()
    }
}
