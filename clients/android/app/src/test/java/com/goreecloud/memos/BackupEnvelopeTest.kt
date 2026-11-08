package com.goreecloud.memos

import org.junit.Assert.*
import org.junit.Test
import java.nio.ByteBuffer
import java.security.GeneralSecurityException

class BackupEnvelopeTest {
    private val passphrase = "synthetic-only long passphrase 2026!".toCharArray()
    private val payload = "Fake offline memo and revisions — not a real backup".toByteArray()

    @Test fun correctPassphraseDecryptsByteExactPayloadWithoutMutatingInputs() {
        val originalPass = passphrase.copyOf()
        val originalBytes = payload.copyOf()
        val encrypted = BackupEnvelope.encrypt(payload, passphrase)
        assertFalse("Plaintext must not appear as the envelope", payload.contentEquals(encrypted))
        assertTrue(encrypted.size > payload.size)
        assertArrayEquals(payload, BackupEnvelope.decrypt(encrypted, passphrase))
        assertArrayEquals(originalPass, passphrase)
        assertArrayEquals(originalBytes, payload)
    }

    @Test fun twoEncryptionsNeverReuseEnvelopeAndBothDecrypt() {
        val a = BackupEnvelope.encrypt(payload, passphrase)
        val b = BackupEnvelope.encrypt(payload, passphrase)
        assertFalse("New salt and nonce must randomize the envelope", a.contentEquals(b))
        assertArrayEquals(payload, BackupEnvelope.decrypt(a, passphrase))
        assertArrayEquals(payload, BackupEnvelope.decrypt(b, passphrase))
    }

    @Test fun wrongPassphraseOrTamperingNeverReturnsPlaintext() {
        val encrypted = BackupEnvelope.encrypt(payload, passphrase)
        val wrong = "another synthetic passphrase completely different".toCharArray()
        assertThrows(GeneralSecurityException::class.java) {
            BackupEnvelope.decrypt(encrypted, wrong)
        }
        val changedCiphertext = encrypted.copyOf().also {
            it[it.lastIndex] = (it.last().toInt() xor 1).toByte()
        }
        assertThrows(GeneralSecurityException::class.java) {
            BackupEnvelope.decrypt(changedCiphertext, passphrase)
        }
        // The full header, including salt and iteration count, is authenticated.
        val changedSalt = encrypted.copyOf().also {
            it[12] = (it[12].toInt() xor 1).toByte()
        }
        assertThrows(GeneralSecurityException::class.java) {
            BackupEnvelope.decrypt(changedSalt, passphrase)
        }
        val changedWorkFactor = encrypted.copyOf()
        ByteBuffer.wrap(changedWorkFactor, 8, 4).putInt(600_001)
        assertThrows(GeneralSecurityException::class.java) {
            BackupEnvelope.decrypt(changedWorkFactor, passphrase)
        }
    }

    @Test fun invalidHeadersTruncationAndHugeEnvelopeAreRejectedBeforeKdf() {
        val encrypted = BackupEnvelope.encrypt(payload, passphrase)
        assertThrows(IllegalArgumentException::class.java) {
            BackupEnvelope.decrypt(encrypted.copyOf(18), passphrase)
        }
        val unknownVersion = encrypted.copyOf().also { it[0] = 0 }
        assertThrows(IllegalArgumentException::class.java) {
            BackupEnvelope.decrypt(unknownVersion, passphrase)
        }
        val tooExpensive = encrypted.copyOf()
        ByteBuffer.wrap(tooExpensive, 8, 4).putInt(2_000_001)
        assertThrows(IllegalArgumentException::class.java) {
            BackupEnvelope.decrypt(tooExpensive, passphrase)
        }
        val tooWeak = encrypted.copyOf()
        ByteBuffer.wrap(tooWeak, 8, 4).putInt(249_999)
        assertThrows(IllegalArgumentException::class.java) {
            BackupEnvelope.decrypt(tooWeak, passphrase)
        }
        val oversized = ByteArray(8 * 1024 * 1024 + 57)
        assertThrows(IllegalArgumentException::class.java) {
            BackupEnvelope.decrypt(oversized, passphrase)
        }
    }

    @Test fun inputBoundsRejectInadequatePassphraseAndOversizedPayload() {
        assertThrows(IllegalArgumentException::class.java) {
            BackupEnvelope.encrypt(payload, "short".toCharArray())
        }
        assertThrows(IllegalArgumentException::class.java) {
            BackupEnvelope.encrypt(payload, CharArray(257) { 'x' })
        }
        assertThrows(IllegalArgumentException::class.java) {
            BackupEnvelope.encrypt(ByteArray(0), passphrase)
        }
        assertThrows(IllegalArgumentException::class.java) {
            BackupEnvelope.encrypt(ByteArray(8 * 1024 * 1024 + 1), passphrase)
        }
    }
}
