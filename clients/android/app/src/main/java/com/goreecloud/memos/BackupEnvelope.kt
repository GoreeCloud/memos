package com.goreecloud.memos

import java.nio.ByteBuffer
import java.security.GeneralSecurityException
import java.security.SecureRandom
import javax.crypto.Cipher
import javax.crypto.SecretKeyFactory
import javax.crypto.spec.GCMParameterSpec
import javax.crypto.spec.PBEKeySpec
import javax.crypto.spec.SecretKeySpec

/**
 * EXPERIMENTAL, NOT USER-ACCESSIBLE. Encrypted byte envelope building block.
 *
 * This class does not read any memo, create any file, export a backup or restore
 * a database. The full snapshot/restore format and user consent flow have not
 * been implemented or qualified. UI must keep saying "Not available yet".
 *
 * Version 1 envelope:
 *   ASCII "GCMEMO1\n" | uint32_be PBKDF2 iterations | salt(16) | nonce(12)
 *   | AES-256-GCM(ciphertext + 16-byte tag)
 * The complete 40-byte header is authenticated as AES-GCM AAD. This limited
 * in-memory proof rejects large payloads; never silently truncate a backup.
 */
internal object BackupEnvelope {
    private val magic = "GCMEMO1\n".toByteArray(Charsets.US_ASCII)
    private const val SALT_BYTES = 16
    private const val NONCE_BYTES = 12
    private const val TAG_BITS = 128
    private const val TAG_BYTES = TAG_BITS / 8
    private const val HEADER_BYTES = 8 + 4 + SALT_BYTES + NONCE_BYTES

    // Bounds exist to limit memory consumption and attacker-supplied CPU work.
    // No UI export is supported until a larger streaming design is reviewed.
    private const val MAX_PLAINTEXT_BYTES = 8 * 1024 * 1024
    private const val MIN_ITERATIONS = 250_000
    private const val MAX_ITERATIONS = 2_000_000
    private const val WRITE_ITERATIONS = 600_000

    fun encrypt(plaintext: ByteArray, passphrase: CharArray): ByteArray {
        require(plaintext.isNotEmpty() && plaintext.size <= MAX_PLAINTEXT_BYTES) {
            "Encrypted envelope payload size is unsupported"
        }
        validatePassphrase(passphrase)
        val salt = ByteArray(SALT_BYTES).also(SecureRandom()::nextBytes)
        val nonce = ByteArray(NONCE_BYTES).also(SecureRandom()::nextBytes)
        val header = ByteBuffer.allocate(HEADER_BYTES)
            .put(magic).putInt(WRITE_ITERATIONS).put(salt).put(nonce).array()
        val key = deriveKey(passphrase, salt, WRITE_ITERATIONS)
        try {
            val cipher = Cipher.getInstance("AES/GCM/NoPadding")
            cipher.init(Cipher.ENCRYPT_MODE, SecretKeySpec(key, "AES"),
                GCMParameterSpec(TAG_BITS, nonce))
            cipher.updateAAD(header)
            val ciphertext = cipher.doFinal(plaintext)
            return header + ciphertext
        } finally {
            key.fill(0)
        }
    }

    @Throws(GeneralSecurityException::class)
    fun decrypt(envelope: ByteArray, passphrase: CharArray): ByteArray {
        // Authenticate the full envelope before exposing any plaintext to the
        // caller, especially before any future restore transaction.
        require(envelope.size in (HEADER_BYTES + TAG_BYTES + 1)..
            (HEADER_BYTES + TAG_BYTES + MAX_PLAINTEXT_BYTES)) {
            "Encrypted envelope length is invalid"
        }
        require(envelope.copyOfRange(0, magic.size).contentEquals(magic)) {
            "Unsupported encrypted envelope version"
        }
        val header = envelope.copyOfRange(0, HEADER_BYTES)
        val cursor = ByteBuffer.wrap(header)
        cursor.position(magic.size)
        val iterations = cursor.int
        require(iterations in MIN_ITERATIONS..MAX_ITERATIONS) {
            "Encrypted envelope KDF work factor is unsupported"
        }
        val salt = ByteArray(SALT_BYTES).also(cursor::get)
        val nonce = ByteArray(NONCE_BYTES).also(cursor::get)
        validatePassphrase(passphrase)
        val key = deriveKey(passphrase, salt, iterations)
        try {
            val cipher = Cipher.getInstance("AES/GCM/NoPadding")
            cipher.init(Cipher.DECRYPT_MODE, SecretKeySpec(key, "AES"),
                GCMParameterSpec(TAG_BITS, nonce))
            cipher.updateAAD(header)
            // If the envelope or passphrase was changed, doFinal throws without
            // returning a partial plaintext result to the caller.
            return cipher.doFinal(envelope, HEADER_BYTES,
                envelope.size - HEADER_BYTES)
        } finally {
            key.fill(0)
        }
    }

    private fun validatePassphrase(passphrase: CharArray) {
        require(passphrase.size in 12..256) {
            "This experimental envelope requires a passphrase of 12–256 characters"
        }
    }

    private fun deriveKey(
        passphrase: CharArray, salt: ByteArray, iterations: Int
    ): ByteArray {
        // Never mutate the caller's buffer. Clear this ephemeral copy and
        // PBEKeySpec once derivation completes. Callers own their passphrase.
        val copy = passphrase.copyOf()
        val spec = PBEKeySpec(copy, salt, iterations, 256)
        try {
            return SecretKeyFactory.getInstance("PBKDF2WithHmacSHA256")
                .generateSecret(spec).encoded
        } finally {
            spec.clearPassword()
            copy.fill('\u0000')
        }
    }
}
