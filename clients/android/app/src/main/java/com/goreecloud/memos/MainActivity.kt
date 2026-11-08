package com.goreecloud.memos

import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.compose.foundation.ExperimentalFoundationApi
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.horizontalScroll
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyRow
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.lazy.staggeredgrid.LazyVerticalStaggeredGrid
import androidx.compose.foundation.lazy.staggeredgrid.StaggeredGridCells
import androidx.compose.foundation.lazy.staggeredgrid.StaggeredGridItemSpan
import androidx.compose.foundation.lazy.staggeredgrid.items
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.KeyboardActions
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalLocale
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.text.input.ImeAction
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.compose.ui.window.Dialog
import androidx.compose.foundation.isSystemInDarkTheme
import androidx.compose.foundation.layout.systemBarsPadding
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext
import java.time.format.DateTimeFormatter
import java.util.Locale

/**
 * Native Android local-only preview. It is NOT a WebView and does NOT sync to
 * the separate single-user Memos API. Remote, reminder, attachment and sharing
 * controls are intentionally visible but truthfully unavailable.
 */
class MainActivity : ComponentActivity() {
    private lateinit var notes: MemoStore

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        notes = MemoStore(applicationContext)
        setContent {
            val dark = isSystemInDarkTheme()
            MaterialTheme(colorScheme = if (dark) GcColors.dark else GcColors.light) {
                MemosHome(notes, dark)
            }
        }
    }

    override fun onDestroy() {
        super.onDestroy()
        notes.close()
    }
}

/** Values verified against GoreeCloud/gc-ui/styles/tokens.css Iris theme. */
private object GcColors {
    val light = lightColorScheme(
        primary = Color(0xFF5145D9), onPrimary = Color.White,
        primaryContainer = Color(0xFFE8E6FF), onPrimaryContainer = Color(0xFF2C227C),
        background = Color(0xFFECF0F8), onBackground = Color(0xFF20243A),
        surface = Color(0xFFF9FAFD), onSurface = Color(0xFF20243A),
        surfaceVariant = Color(0xFFE5EBF6), onSurfaceVariant = Color(0xFF666C80),
        outline = Color(0xFFE5E7F0)
    )
    val dark = darkColorScheme(
        primary = Color(0xFFC5BFFF), onPrimary = Color(0xFF241B66),
        primaryContainer = Color(0xFF39316B), onPrimaryContainer = Color(0xFFEBE8FF),
        background = Color(0xFF10131E), onBackground = Color(0xFFF2F2FA),
        surface = Color(0xFF1D2231), onSurface = Color(0xFFF2F2FA),
        surfaceVariant = Color(0xFF292F40), onSurfaceVariant = Color(0xFFADB2C5),
        outline = Color(0xFF34394C)
    )
    fun paper(color: String, dark: Boolean): Color {
        val palette = if (dark) mapOf(
            "sun" to 0xFF4F4027, "mint" to 0xFF254337, "sky" to 0xFF263F57,
            "rose" to 0xFF4B2C38, "lavender" to 0xFF3A3154
        ) else mapOf(
            "sun" to 0xFFFFF5D9, "mint" to 0xFFE6F7EB, "sky" to 0xFFE6F3FF,
            "rose" to 0xFFFFEDEF, "lavender" to 0xFFF0EBFF
        )
        return Color(palette[color] ?: if (dark) 0xFF252B3D else 0xFFFFFFFF)
    }
}

@OptIn(ExperimentalFoundationApi::class)
@Composable
private fun MemosHome(store: MemoStore, dark: Boolean) {
    val scope = rememberCoroutineScope()
    val currentLocale = LocalLocale.current.platformLocale
    val snackbar = remember { SnackbarHostState() }
    var notes by remember { mutableStateOf<List<Memo>>(emptyList()) }
    var loading by remember { mutableStateOf(true) }
    var query by remember { mutableStateOf("") }
    var selectedTag by remember { mutableStateOf("") }
    var folder by remember { mutableStateOf("All Notes") }
    var quick by remember { mutableStateOf("") }
    var quickSaving by remember { mutableStateOf(false) }
    var saving by remember { mutableStateOf(false) }
    var editorOpen by remember { mutableStateOf(false) }
    var editing by remember { mutableStateOf<Memo?>(null) }
    var menuOpen by remember { mutableStateOf(false) }
    var showLocalDataInfo by remember { mutableStateOf(false) }

    fun message(value: String) { scope.launch { snackbar.showSnackbar(value) } }
    fun unavailable(feature: String) { message(feature + ": Not available yet") }
    fun refresh() {
        scope.launch {
            try {
                val fresh = withContext(Dispatchers.IO) { store.list() }
                notes = fresh
            } catch (e: Exception) {
                message("Unable to read local notes: " + (e.message ?: "Unknown error"))
            } finally {
                loading = false
            }
        }
    }
    LaunchedEffect(store) { refresh() }

    fun open(memo: Memo?) {
        editing = memo
        editorOpen = true
    }
    fun createQuick() {
        val draft = quick
        if (draft.isBlank() || quickSaving) return
        quickSaving = true
        scope.launch {
            try {
                withContext(Dispatchers.IO) {
                    store.save(null, "", draft, "sun", pinned = false, archived = false)
                }
                if (quick == draft) quick = ""
                refresh()
                message("Saved on this device · no backup yet")
            } catch (e: Exception) {
                message("Save failed: " + (e.message ?: "Unknown error"))
            } finally {
                quickSaving = false
            }
        }
    }
    fun saveEditor(
        title: String, body: String, color: String,
        pinned: Boolean, archived: Boolean
    ) {
        if (saving) return
        saving = true
        val source = editing
        scope.launch {
            try {
                withContext(Dispatchers.IO) {
                    store.save(source, title, body, color, pinned, archived, source?.deleted ?: false)
                }
                editorOpen = false
                refresh()
                message("Saved locally")
            } catch (e: Exception) {
                message("Save failed: " + (e.message ?: "Unknown error"))
            } finally {
                saving = false
            }
        }
    }
    fun changeFolder(next: String) {
        folder = next
        selectedTag = ""
    }
    val allTags = remember(notes) {
        notes.asSequence().filter { !it.deleted }.flatMap { MemoLogic.tags(it.content).asSequence() }
            .groupingBy { it }.eachCount().toList().sortedByDescending { it.second }.take(12)
    }
    val visible = notes.filter { memo ->
        val correctFolder = when (folder) {
            "Pinned" -> !memo.deleted && !memo.archived && memo.pinned
            "Archive" -> !memo.deleted && memo.archived
            "Trash" -> memo.deleted
            else -> !memo.deleted && !memo.archived
        }
        correctFolder && MemoLogic.matches(memo, query, selectedTag)
    }.sortedWith(compareByDescending<Memo> { it.updatedAt }.thenByDescending { it.id })
    val groups = visible.groupBy { MemoLogic.localDate(it.updatedAt) }

    BoxWithConstraints(
        modifier = Modifier.fillMaxSize().background(MaterialTheme.colorScheme.background)
            .systemBarsPadding()
    ) {
        val expanded = maxWidth >= 820.dp
        val showInsights = maxWidth >= 1210.dp
        Row(Modifier.fillMaxSize()) {
            if (expanded) {
                NavigationRailPanel(
                    current = folder, notesCount = notes.count { !it.deleted },
                    onFolder = ::changeFolder, onNew = { open(null) },
                    onUnavailable = ::unavailable
                )
            }
            Column(Modifier.weight(1f).fillMaxHeight()) {
                Header(
                    expanded = expanded,
                    onMenu = { menuOpen = true }, menuOpen = menuOpen,
                    onDismissMenu = { menuOpen = false },
                    onUnavailable = {
                        menuOpen = false
                        if (it == "Local data & backups") showLocalDataInfo = true
                        else unavailable(it)
                    }
                )
                Column(Modifier.padding(horizontal = 16.dp).padding(top = 10.dp)) {
                    OutlinedTextField(
                        value = query,
                        onValueChange = { query = it.take(200) },
                        modifier = Modifier.fillMaxWidth(),
                        placeholder = { Text("Search notes, tags, or ideas…") },
                        label = { Text("Search local memos") },
                        singleLine = true,
                        shape = RoundedCornerShape(15.dp),
                        keyboardOptions = KeyboardOptions(imeAction = ImeAction.Search),
                        keyboardActions = KeyboardActions(onSearch = {})
                    )
                    Spacer(Modifier.height(10.dp))
                    Card(
                        colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface),
                        shape = RoundedCornerShape(19.dp),
                        elevation = CardDefaults.cardElevation(defaultElevation = 2.dp),
                        modifier = Modifier.fillMaxWidth()
                    ) {
                        Column(Modifier.padding(12.dp)) {
                            OutlinedTextField(
                                value = quick,
                                onValueChange = { quick = it.take(MemoLogic.MAX_CONTENT) },
                                modifier = Modifier.fillMaxWidth(),
                                label = { Text("Take a memo…") },
                                minLines = 2,
                                maxLines = 4,
                                shape = RoundedCornerShape(13.dp)
                            )
                            Spacer(Modifier.height(8.dp))
                            Row(verticalAlignment = Alignment.CenterVertically) {
                                TextButton(onClick = {
                                    quick += if (quick.isBlank() || quick.endsWith("\n")) "- [ ] "
                                    else "\n- [ ] "
                                }) { Text("☑ Checklist") }
                                TextButton(onClick = { unavailable("Attachments") }) { Text("＋ Attach") }
                                Spacer(Modifier.weight(1f))
                                Button(
                                    onClick = ::createQuick, enabled = quick.isNotBlank() && !quickSaving,
                                    shape = RoundedCornerShape(12.dp)
                                ) { Text(if (quickSaving) "Saving…" else "Save") }
                            }
                        }
                    }
                    Spacer(Modifier.height(9.dp))
                    LazyRow(horizontalArrangement = Arrangement.spacedBy(7.dp)) {
                        items(listOf("All Notes", "Pinned", "Archive", "Trash")) { option ->
                            FilterChip(
                                selected = folder == option,
                                onClick = { changeFolder(option) },
                                label = { Text(option) }
                            )
                        }
                        item {
                            FilterChip(selected = false, onClick = { unavailable("Shared notes") },
                                label = { Text("Shared") })
                        }
                    }
                    if (allTags.isNotEmpty()) {
                        LazyRow(horizontalArrangement = Arrangement.spacedBy(6.dp)) {
                            items(allTags) { (tag, count) ->
                                FilterChip(
                                    selected = selectedTag == tag,
                                    onClick = { selectedTag = if (selectedTag == tag) "" else tag },
                                    label = { Text("#" + tag + " " + count, maxLines = 1) }
                                )
                            }
                        }
                    }
                    Spacer(Modifier.height(5.dp))
                    Row(verticalAlignment = Alignment.CenterVertically) {
                        Text(
                            if (loading) "Loading…" else visible.size.toString() + " local memos",
                            style = MaterialTheme.typography.labelMedium,
                            color = MaterialTheme.colorScheme.onSurfaceVariant
                        )
                        Spacer(Modifier.weight(1f))
                        TextButton(onClick = { unavailable("Cloud synchronization") }) {
                            Text("● Device only")
                        }
                    }
                }
                if (loading) {
                    Box(Modifier.weight(1f).fillMaxWidth(), contentAlignment = Alignment.Center) {
                        CircularProgressIndicator()
                    }
                } else if (visible.isEmpty()) {
                    Column(
                        Modifier.weight(1f).fillMaxWidth().padding(24.dp),
                        verticalArrangement = Arrangement.Center,
                        horizontalAlignment = Alignment.CenterHorizontally
                    ) {
                        Text("✦", fontSize = 45.sp, color = MaterialTheme.colorScheme.primary)
                        Spacer(Modifier.height(12.dp))
                        Text(
                            if (query.isNotBlank() || selectedTag.isNotBlank()) "No matching memos"
                            else if (folder == "Pinned") "Nothing pinned yet"
                            else if (folder == "Archive") "No archived memos"
                            else if (folder == "Trash") "Trash is empty"
                            else "A little space for big ideas.",
                            style = MaterialTheme.typography.titleMedium, fontWeight = FontWeight.Bold
                        )
                        Text(
                            if (folder == "All Notes" && query.isBlank() && selectedTag.isBlank())
                                "Capture a thought to begin. Saved memos stay on this device."
                            else "Try another filter or create a new memo.",
                            color = MaterialTheme.colorScheme.onSurfaceVariant
                        )
                        Spacer(Modifier.height(16.dp))
                        Button(onClick = { open(null) }) { Text("＋ New memo") }
                    }
                } else {
                    LazyVerticalStaggeredGrid(
                        columns = StaggeredGridCells.Adaptive(if (expanded) 255.dp else 280.dp),
                        horizontalArrangement = Arrangement.spacedBy(12.dp),
                        verticalItemSpacing = 12.dp,
                        contentPadding = PaddingValues(start = 16.dp, end = 16.dp, bottom = 26.dp),
                        modifier = Modifier.weight(1f).fillMaxWidth()
                    ) {
                        for ((day, itemsForDay) in groups) {
                            item(span = StaggeredGridItemSpan.FullLine, key = "heading_" + day.toString()) {
                                Row(
                                    Modifier.fillMaxWidth().padding(top = 13.dp, bottom = 3.dp),
                                    verticalAlignment = Alignment.CenterVertically
                                ) {
                                    Box(Modifier.size(9.dp).background(
                                        MaterialTheme.colorScheme.primary, CircleShape))
                                    Spacer(Modifier.width(8.dp))
                                    Text(
                                        MemoLogic.dayHeading(itemsForDay.first().updatedAt),
                                        style = MaterialTheme.typography.titleSmall,
                                        fontWeight = FontWeight.Bold
                                    )
                                    Spacer(Modifier.width(8.dp))
                                    Text(
                                        day.format(DateTimeFormatter.ofPattern("MMM d, yyyy", currentLocale)) +
                                            " · " + itemsForDay.size + " notes",
                                        style = MaterialTheme.typography.labelSmall,
                                        color = MaterialTheme.colorScheme.onSurfaceVariant
                                    )
                                }
                            }
                            items(itemsForDay, key = { it.id }) { memo ->
                                MemoCard(memo, dark, onClick = { open(memo) })
                            }
                        }
                    }
                }
                if (!expanded) {
                    Row(
                        Modifier.fillMaxWidth()
                            .background(MaterialTheme.colorScheme.surface)
                            .padding(horizontal = 6.dp, vertical = 5.dp),
                        horizontalArrangement = Arrangement.SpaceEvenly
                    ) {
                        TextButton(onClick = { changeFolder("All Notes") }) { Text("All") }
                        TextButton(onClick = { changeFolder("Pinned") }) { Text("Pinned") }
                        TextButton(onClick = { open(null) }) { Text("＋ New") }
                        TextButton(onClick = { unavailable("Reminders") }) { Text("Reminders") }
                    }
                }
            }
            if (showInsights) {
                InsightsPanel(notes, onUnavailable = ::unavailable)
            }
        }
        SnackbarHost(
            snackbar, modifier = Modifier.align(Alignment.BottomCenter)
                .padding(bottom = if (expanded) 12.dp else 64.dp)
        )
    }
    if (showLocalDataInfo) {
        AlertDialog(
            onDismissRequest = { showLocalDataInfo = false },
            title = { Text("Local notes have no backup") },
            text = {
                Text(
                    "This is an offline development preview. Memos are stored only in " +
                    "this app's private database. Sync, export and restore are " +
                    "not available yet. Clearing app data or uninstalling this app " +
                    "can permanently erase all locally saved memos. Use only " +
                    "disposable test content until private recovery is implemented."
                )
            },
            confirmButton = {
                TextButton(onClick = { showLocalDataInfo = false }) {
                    Text("Got it")
                }
            }
        )
    }
    if (editorOpen) {
        MemoEditor(
            memo = editing, saving = saving, dark = dark,
            onDismiss = { if (!saving) editorOpen = false },
            onSave = ::saveEditor,
            onDuplicate = {
                val source = editing ?: return@MemoEditor
                if (!saving) {
                    saving = true
                    scope.launch {
                        try {
                            withContext(Dispatchers.IO) { store.duplicate(source) }
                            editorOpen = false
                            refresh()
                            message("Memo duplicated locally")
                        } catch (e: Exception) {
                            message("Duplicate failed: " + (e.message ?: "Unknown error"))
                        } finally { saving = false }
                    }
                }
            },
            onTrash = {
                val source = editing ?: return@MemoEditor
                if (!saving) {
                    saving = true
                    scope.launch {
                        try {
                            withContext(Dispatchers.IO) {
                                store.save(source, source.title, source.content, source.color,
                                    source.pinned, source.archived, deleted = !source.deleted)
                            }
                            editorOpen = false
                            refresh()
                            message(if (source.deleted) "Memo restored" else "Moved to Trash")
                        } catch (e: Exception) {
                            message("Unable to update memo: " + (e.message ?: "Unknown error"))
                        } finally { saving = false }
                    }
                }
            },
            onUnavailable = ::unavailable
        )
    }
}

@Composable
private fun Header(
    expanded: Boolean, onMenu: () -> Unit, menuOpen: Boolean,
    onDismissMenu: () -> Unit, onUnavailable: (String) -> Unit
) {
    Row(
        Modifier.fillMaxWidth().background(MaterialTheme.colorScheme.surface)
            .padding(horizontal = 17.dp, vertical = 10.dp),
        verticalAlignment = Alignment.CenterVertically
    ) {
        Box(
            Modifier.size(39.dp).background(
                MaterialTheme.colorScheme.primaryContainer, RoundedCornerShape(13.dp)),
            contentAlignment = Alignment.Center
        ) {
            Text("☁", fontSize = 23.sp, color = MaterialTheme.colorScheme.primary)
        }
        Spacer(Modifier.width(10.dp))
        Column(Modifier.weight(1f)) {
            Text("GoreeCloud Memos", style = MaterialTheme.typography.titleMedium,
                fontWeight = FontWeight.Bold, maxLines = 1, overflow = TextOverflow.Ellipsis)
            Text("LOCAL ONLY · NO BACKUP", fontSize = 9.sp,
                color = MaterialTheme.colorScheme.onSurfaceVariant)
        }
        Box {
            TextButton(onClick = onMenu) { Text("⋯ More") }
            DropdownMenu(expanded = menuOpen, onDismissRequest = onDismissMenu) {
                listOf("Local data & backups", "Reminders", "Attachments", "Sharing", "Sync", "Settings", "Profile").forEach { feature ->
                    DropdownMenuItem(text = { Text(feature) }, onClick = { onUnavailable(feature) })
                }
            }
        }
    }
}

@Composable
private fun NavigationRailPanel(
    current: String, notesCount: Int,
    onFolder: (String) -> Unit, onNew: () -> Unit, onUnavailable: (String) -> Unit
) {
    Column(
        Modifier.width(205.dp).fillMaxHeight()
            .background(MaterialTheme.colorScheme.surface)
            .padding(14.dp)
    ) {
        Button(onClick = onNew, modifier = Modifier.fillMaxWidth()) { Text("＋ New memo") }
        Spacer(Modifier.height(18.dp))
        listOf("All Notes", "Pinned", "Archive", "Trash").forEach { label ->
            NavigationDrawerItem(
                label = { Text(label + if (label == "All Notes") "  " + notesCount else "") },
                selected = current == label, onClick = { onFolder(label) },
                modifier = Modifier.padding(bottom = 6.dp)
            )
        }
        HorizontalDivider(Modifier.padding(vertical = 10.dp))
        listOf("Quick Capture", "Reminders", "Timeline", "Tags", "Shared", "Settings").forEach { label ->
            TextButton(onClick = {
                if (label == "Quick Capture") onNew()
                else if (label == "Timeline") onFolder("All Notes")
                else onUnavailable(label)
            }, modifier = Modifier.fillMaxWidth()) { Text(label) }
        }
        Spacer(Modifier.weight(1f))
        HorizontalDivider()
        Text("◉  On-device only", color = MaterialTheme.colorScheme.onSurfaceVariant,
            fontSize = 12.sp, modifier = Modifier.padding(vertical = 16.dp))
    }
}

@Composable
private fun InsightsPanel(notes: List<Memo>, onUnavailable: (String) -> Unit) {
    Column(
        Modifier.width(270.dp).fillMaxHeight()
            .background(MaterialTheme.colorScheme.surface)
            .padding(16.dp)
    ) {
        Text("YOUR LOCAL WORKSPACE", style = MaterialTheme.typography.labelMedium,
            color = MaterialTheme.colorScheme.onSurfaceVariant)
        Spacer(Modifier.height(14.dp))
        Card(
            colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surfaceVariant)
        ) {
            Column(Modifier.fillMaxWidth().padding(14.dp)) {
                Text("Calendar", style = MaterialTheme.typography.titleMedium,
                    fontWeight = FontWeight.Bold)
                Text("Calendar integration: Not available yet", fontSize = 12.sp)
                TextButton(onClick = { onUnavailable("Calendar") }) { Text("Open calendar") }
            }
        }
        Spacer(Modifier.height(12.dp))
        Text("TRENDING TAGS", fontWeight = FontWeight.Bold,
            style = MaterialTheme.typography.labelMedium)
        val popular = notes.filter { !it.deleted }
            .flatMap { MemoLogic.tags(it.content) }
            .groupingBy { it }.eachCount().toList()
            .sortedByDescending { it.second }.take(7)
        popular.forEach { (tag, count) ->
            Text("#" + tag + "  " + count, Modifier.padding(vertical = 5.dp),
                style = MaterialTheme.typography.bodySmall)
        }
        Spacer(Modifier.height(12.dp))
        HorizontalDivider()
        Spacer(Modifier.height(12.dp))
        Text("RECENT NOTES", fontWeight = FontWeight.Bold,
            style = MaterialTheme.typography.labelMedium)
        notes.filter { !it.deleted }.sortedByDescending { it.updatedAt }.take(5).forEach {
            Text(it.title.ifBlank { "Untitled memo" }, Modifier.padding(vertical = 6.dp),
                style = MaterialTheme.typography.bodySmall,
                maxLines = 1, overflow = TextOverflow.Ellipsis)
        }
        Spacer(Modifier.height(14.dp))
        TextButton(onClick = { onUnavailable("Shared activity") }) { Text("See shared activity") }
    }
}

@Composable
private fun MemoCard(memo: Memo, dark: Boolean, onClick: () -> Unit) {
    val currentLocale = LocalLocale.current.platformLocale
    Card(
        onClick = onClick, modifier = Modifier.fillMaxWidth(),
        colors = CardDefaults.cardColors(containerColor = GcColors.paper(memo.color, dark)),
        shape = RoundedCornerShape(17.dp),
        elevation = CardDefaults.cardElevation(defaultElevation = 1.dp)
    ) {
        Column(Modifier.padding(16.dp)) {
            Row(verticalAlignment = Alignment.CenterVertically) {
                Text(
                    memo.title.ifBlank { "Untitled memo" }, fontWeight = FontWeight.Bold,
                    style = MaterialTheme.typography.titleSmall,
                    color = MaterialTheme.colorScheme.onSurface,
                    maxLines = 2, overflow = TextOverflow.Ellipsis,
                    modifier = Modifier.weight(1f)
                )
                if (memo.pinned) Text("⚑", color = MaterialTheme.colorScheme.primary)
            }
            Spacer(Modifier.height(8.dp))
            Text(
                memo.content, color = MaterialTheme.colorScheme.onSurface,
                style = MaterialTheme.typography.bodyMedium,
                maxLines = 10, overflow = TextOverflow.Ellipsis
            )
            val tags = MemoLogic.tags(memo.content)
            if (tags.isNotEmpty()) {
                Spacer(Modifier.height(10.dp))
                Text(tags.take(5).joinToString("  ") { "#" + it },
                    fontSize = 12.sp, color = MaterialTheme.colorScheme.primary)
            }
            Spacer(Modifier.height(12.dp))
            Text(
                "Updated " + MemoLogic.localDate(memo.updatedAt)
                    .format(DateTimeFormatter.ofPattern("MMM d", currentLocale)) +
                    " · v" + memo.version,
                style = MaterialTheme.typography.labelSmall,
                color = MaterialTheme.colorScheme.onSurfaceVariant
            )
        }
    }
}

@Composable
private fun MemoEditor(
    memo: Memo?, saving: Boolean, dark: Boolean,
    onDismiss: () -> Unit,
    onSave: (String, String, String, Boolean, Boolean) -> Unit,
    onDuplicate: () -> Unit, onTrash: () -> Unit,
    onUnavailable: (String) -> Unit
) {
    var title by remember(memo?.id) { mutableStateOf(memo?.title ?: "") }
    var content by remember(memo?.id) { mutableStateOf(memo?.content ?: "") }
    var color by remember(memo?.id) { mutableStateOf(memo?.color ?: "paper") }
    var pinned by remember(memo?.id) { mutableStateOf(memo?.pinned ?: false) }
    var archived by remember(memo?.id) { mutableStateOf(memo?.archived ?: false) }
    var confirmDiscard by remember { mutableStateOf(false) }
    var confirmTrash by remember { mutableStateOf(false) }
    var confirmDuplicate by remember { mutableStateOf(false) }
    val dirty = title != (memo?.title ?: "") || content != (memo?.content ?: "") ||
        color != (memo?.color ?: "paper") || pinned != (memo?.pinned ?: false) ||
        archived != (memo?.archived ?: false)
    val dismissSafely = {
        if (!saving) {
            if (dirty) confirmDiscard = true else onDismiss()
        }
    }
    Dialog(onDismissRequest = dismissSafely) {
        Surface(
            shape = RoundedCornerShape(24.dp),
            color = MaterialTheme.colorScheme.surface,
            modifier = Modifier.fillMaxWidth().heightIn(max = 740.dp)
        ) {
            Column(Modifier.verticalScroll(rememberScrollState()).padding(18.dp)) {
                Row(verticalAlignment = Alignment.CenterVertically) {
                    Text(if (memo == null) "New memo" else "Edit memo · v" + memo.version,
                        style = MaterialTheme.typography.titleLarge,
                        fontWeight = FontWeight.Bold, modifier = Modifier.weight(1f))
                    TextButton(onClick = dismissSafely) { Text("Close") }
                }
                Spacer(Modifier.height(11.dp))
                OutlinedTextField(
                    title, { title = it.take(MemoLogic.MAX_TITLE) },
                    modifier = Modifier.fillMaxWidth(), label = { Text("Optional title") },
                    singleLine = true, readOnly = saving, shape = RoundedCornerShape(13.dp)
                )
                Spacer(Modifier.height(10.dp))
                OutlinedTextField(
                    content, { content = it.take(MemoLogic.MAX_CONTENT) },
                    modifier = Modifier.fillMaxWidth().heightIn(min = 170.dp),
                    label = { Text("Memo content — Markdown source") },
                    minLines = 6, readOnly = saving, shape = RoundedCornerShape(13.dp)
                )
                Row(verticalAlignment = Alignment.CenterVertically) {
                    TextButton(enabled = !saving, onClick = {
                        content += if (content.isBlank() || content.endsWith("\n")) "- [ ] "
                        else "\n- [ ] "
                    }) { Text("☑ Checklist") }
                    TextButton(onClick = { onUnavailable("Markdown preview") }) { Text("Preview") }
                    TextButton(onClick = { onUnavailable("Attachments") }) { Text("Attach") }
                }
                Spacer(Modifier.height(8.dp))
                Text("Card color", style = MaterialTheme.typography.labelLarge)
                Row(Modifier.horizontalScroll(rememberScrollState()),
                    horizontalArrangement = Arrangement.spacedBy(7.dp)) {
                    MemoLogic.colors.forEach { option ->
                        FilterChip(
                            selected = color == option, enabled = !saving,
                            onClick = { color = option },
                            label = { Text(option) },
                            leadingIcon = {
                                Box(Modifier.size(12.dp).background(
                                    GcColors.paper(option, dark), CircleShape))
                            }
                        )
                    }
                }
                Row(verticalAlignment = Alignment.CenterVertically) {
                    Text("Pinned", modifier = Modifier.weight(1f))
                    Switch(checked = pinned, enabled = !saving,
                        onCheckedChange = { pinned = it })
                }
                Row(verticalAlignment = Alignment.CenterVertically) {
                    Text("Archived", modifier = Modifier.weight(1f))
                    Switch(checked = archived, enabled = !saving,
                        onCheckedChange = { archived = it })
                }
                Spacer(Modifier.height(7.dp))
                Row(horizontalArrangement = Arrangement.spacedBy(6.dp)) {
                    if (memo != null && !memo.deleted) {
                        TextButton(onClick = {
                            if (dirty) confirmDuplicate = true else onDuplicate()
                        }, enabled = !saving) { Text("Duplicate") }
                    }
                    if (memo != null) {
                        TextButton(onClick = { confirmTrash = true }, enabled = !saving) {
                            Text(if (memo.deleted) "Restore" else "Trash")
                        }
                    }
                    Spacer(Modifier.weight(1f))
                    Button(
                        enabled = !saving && (title.isNotBlank() || content.isNotBlank()),
                        onClick = { onSave(title, content, color, pinned, archived) }
                    ) { Text(if (saving) "Saving…" else "Save memo") }
                }
                Text("Private local preview · no sync or backup",
                    style = MaterialTheme.typography.labelSmall,
                    color = MaterialTheme.colorScheme.onSurfaceVariant)
            }
        }
    }
    if (confirmDiscard) {
        AlertDialog(
            onDismissRequest = { confirmDiscard = false },
            title = { Text("Discard unsaved edits?") },
            text = { Text("Changes in this editor have not been saved.") },
            confirmButton = {
                TextButton(onClick = { confirmDiscard = false; onDismiss() }) { Text("Discard") }
            },
            dismissButton = {
                TextButton(onClick = { confirmDiscard = false }) { Text("Keep editing") }
            }
        )
    }
    if (confirmDuplicate) {
        AlertDialog(
            onDismissRequest = { confirmDuplicate = false },
            title = { Text("Duplicate last saved version?") },
            text = {
                Text("Your unsaved edits will not be included. " +
                    "Save your changes first if they should appear in the copy.")
            },
            confirmButton = {
                TextButton(onClick = { confirmDuplicate = false; onDuplicate() }) {
                    Text("Duplicate saved memo")
                }
            },
            dismissButton = {
                TextButton(onClick = { confirmDuplicate = false }) {
                    Text("Keep editing")
                }
            }
        )
    }
    if (confirmTrash) {
        AlertDialog(
            onDismissRequest = { confirmTrash = false },
            title = { Text(if (memo?.deleted == true) "Restore memo?" else "Move to Trash?") },
            text = {
                Text("This changes only the memo stored on this device." +
                    if (dirty) " Unsaved editor changes will be discarded." else "")
            },
            confirmButton = {
                TextButton(onClick = { confirmTrash = false; onTrash() }) {
                    Text(if (memo?.deleted == true) "Restore" else "Move to Trash")
                }
            },
            dismissButton = {
                TextButton(onClick = { confirmTrash = false }) { Text("Cancel") }
            }
        )
    }
}
