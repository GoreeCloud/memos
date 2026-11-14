// GoreeCloud Memos Qt Quick migration preview.
// Static palette values below are from gc-ui tokens/gc.tokens.json at
// 5ea0b8f0b1d4c9f7c3593d58daeb1b75e6ec980e (provisional alpha Iris/light).
// Not yet a native GC UI SDK or verified accessible production theme.
import QtQuick
import QtQuick.Controls
import QtQuick.Layouts

ApplicationWindow {
    id: root
    visible: true
    width: 1030
    height: 730
    minimumWidth: 480
    minimumHeight: 360
    title: qsTr("GoreeCloud Memos — Qt Quick preview")
    color: "#F6F7FB" // GC UI Cloud Canvas

    readonly property color gcText: "#1B2030"
    readonly property color gcTextSoft: "#505B70"
    readonly property color gcSurface: "#FFFFFF"
    readonly property color gcTonal: "#EEF0F7"
    readonly property color gcBrand: "#5146C8" // Iris light
    readonly property color gcOutline: "#CED3DF"
    readonly property int columnCount: width >= 950 ? 3 : (width >= 620 ? 2 : 1)
    property var columns: [[], [], []]

    function rebalance() {
        var next = [[], [], []]
        var heights = [0, 0, 0]
        var notes = memosBackend.notes || []
        for (var i = 0; i < notes.length; i++) {
            var note = notes[i]
            var target = 0
            for (var j = 1; j < columnCount; j++) {
                if (heights[j] < heights[target]) target = j
            }
            next[target].push(note)
            heights[target] += 94 + Math.min(String(note.content || "").length, 500) * 0.32
        }
        columns = next
    }

    function openEditor(note) {
        editor.memoId = note ? String(note.id) : ""
        editor.memoVersion = note ? Number(note.version) : 0
        titleInput.text = note ? String(note.title || "") : ""
        bodyInput.text = note ? String(note.content || "") : ""
        editor.open()
    }

    onColumnCountChanged: rebalance()
    Component.onCompleted: rebalance()

    Connections {
        target: memosBackend
        function onNotesChanged() { root.rebalance() }
        function onSaveSucceeded() {
            editor.close()
            memosBackend.refresh(searchField.text)
        }
    }

    Timer {
        id: searchDebounce
        interval: 300
        repeat: false
        onTriggered: memosBackend.refresh(searchField.text)
    }

    // Native desktop keyboard paths. Do not open a second editor while a
    // modal editor is active, or allow a shortcut to interrupt an async save.
    Shortcut {
        sequence: StandardKey.New
        autoRepeat: false
        enabled: !editor.visible && !memosBackend.saving
        onActivated: root.openEditor(null)
    }
    Shortcut {
        sequence: StandardKey.Find
        autoRepeat: false
        enabled: !editor.visible && !memosBackend.saving
        onActivated: {
            searchField.forceActiveFocus(Qt.ShortcutFocusReason)
            searchField.selectAll()
        }
    }

    ColumnLayout {
        anchors.fill: parent
        anchors.margins: 24
        spacing: 16

        RowLayout {
            Layout.fillWidth: true
            spacing: 12
            Label {
                text: qsTr("✦  GoreeCloud Memos")
                color: root.gcBrand
                font.pixelSize: 23
                font.bold: true
                Layout.fillWidth: true
                elide: Text.ElideRight
            }
            TextField {
                id: searchField
                objectName: "memos-search-field"
                Layout.preferredWidth: Math.min(300, Math.max(160, root.width * 0.28))
                placeholderText: qsTr("Search memos…")
                Accessible.name: qsTr("Search private memos")
                onTextEdited: searchDebounce.restart()
            }
            Button {
                text: qsTr("＋ New memo")
                Accessible.name: qsTr("Create a memo")
                highlighted: true
                onClicked: root.openEditor(null)
            }
        }

        Rectangle {
            Layout.fillWidth: true
            implicitHeight: 44
            visible: memosBackend.loading || memosBackend.message.length > 0
            radius: 12
            color: root.gcTonal
            border.color: root.gcOutline
            Label {
                anchors.fill: parent
                anchors.margins: 12
                verticalAlignment: Text.AlignVCenter
                color: root.gcText
                wrapMode: Text.WordWrap
                text: memosBackend.loading ? qsTr("Loading memos…") : memosBackend.message
                textFormat: Text.PlainText
                Accessible.role: Accessible.StaticText
            }
        }

        Label {
            Layout.fillWidth: true
            visible: !memosBackend.loading && memosBackend.message.length === 0 && memosBackend.notes.length === 0
            text: qsTr("No memos yet. Create your first thought.")
            color: root.gcTextSoft
        }

        Flickable {
            id: viewport
            Layout.fillWidth: true
            Layout.fillHeight: true
            clip: true
            contentWidth: width
            contentHeight: memoColumns.implicitHeight + 16
            boundsBehavior: Flickable.StopAtBounds
            ScrollBar.vertical: ScrollBar { policy: ScrollBar.AsNeeded }

            Row {
                id: memoColumns
                width: viewport.width
                spacing: 16
                Repeater {
                    model: root.columnCount
                    delegate: Column {
                        property int columnNumber: index
                        width: (memoColumns.width - (root.columnCount - 1) * memoColumns.spacing) / root.columnCount
                        spacing: 16
                        Repeater {
                            model: root.columns[columnNumber] || []
                            delegate: Button {
                                id: memoCard
                                property var note: modelData
                                width: parent.width
                                padding: 18
                                implicitHeight: Math.max(134, cardContents.implicitHeight + 36)
                                onClicked: root.openEditor(note)
                                Accessible.name: (note.title ? note.title : qsTr("Untitled memo")) + ". " +
                                    String(note.content || "").slice(0, 100)
                                background: Rectangle {
                                    radius: 18
                                    color: memoCard.hovered ? "#EEF0F7" : root.gcSurface
                                    border.width: memoCard.activeFocus ? 2 : 1
                                    border.color: memoCard.activeFocus ? root.gcBrand : root.gcOutline
                                }
                                contentItem: Column {
                                    id: cardContents
                                    width: memoCard.availableWidth
                                    spacing: 10
                                    Text {
                                        width: cardContents.width
                                        visible: String(memoCard.note.title || "").length > 0
                                        text: String(memoCard.note.title || "")
                                        textFormat: Text.PlainText
                                        wrapMode: Text.Wrap
                                        font.bold: true
                                        font.pixelSize: 16
                                        color: root.gcText
                                    }
                                    Text {
                                        width: cardContents.width
                                        text: String(memoCard.note.content || "").slice(0, 500) || qsTr("Empty memo")
                                        textFormat: Text.PlainText
                                        wrapMode: Text.Wrap
                                        maximumLineCount: 9
                                        elide: Text.ElideRight
                                        font.pixelSize: 14
                                        color: root.gcTextSoft
                                    }
                                    Text {
                                        width: cardContents.width
                                        text: (memoCard.note.pinned ? qsTr("✦ Pinned · ") : "") +
                                            String(memoCard.note.updated_at || "").slice(0, 10)
                                        textFormat: Text.PlainText
                                        color: root.gcTextSoft
                                        font.pixelSize: 12
                                    }
                                }
                            }
                        }
                    }
                }
            }
        }
    }

    Dialog {
        id: editor
        objectName: "memos-editor"
        focus: true
        property string memoId: ""
        property int memoVersion: 0
        modal: true
        title: memoId.length > 0 ? qsTr("Edit memo") : qsTr("New memo")
        width: Math.min(root.width - 48, 620)
        height: Math.min(root.height - 48, 540)
        x: (root.width - width) / 2
        y: (root.height - height) / 2
        closePolicy: memosBackend.saving ? Popup.NoAutoClose : Popup.CloseOnEscape
        // Focus the first editable field after the modal obtains keyboard focus.
        onOpened: titleInput.forceActiveFocus(Qt.PopupFocusReason)
        onClosed: memosBackend.discardDraft()

        contentItem: ColumnLayout {
            spacing: 12
            TextField {
                id: titleInput
                objectName: "memos-title-field"
                Layout.fillWidth: true
                placeholderText: qsTr("Title (optional)")
                Accessible.name: qsTr("Memo title")
                enabled: !memosBackend.saving
            }
            ScrollView {
                Layout.fillWidth: true
                Layout.fillHeight: true
                TextArea {
                    id: bodyInput
                    wrapMode: TextEdit.Wrap
                    placeholderText: qsTr("Write your memo…")
                    Accessible.name: qsTr("Memo content")
                    enabled: !memosBackend.saving
                }
            }
            RowLayout {
                Layout.fillWidth: true
                Item { Layout.fillWidth: true }
                Button {
                    text: qsTr("Cancel")
                    enabled: !memosBackend.saving
                    onClicked: editor.close()
                }
                Button {
                    text: memosBackend.saving ? qsTr("Saving…") : qsTr("Save memo")
                    highlighted: true
                    enabled: !memosBackend.saving
                    onClicked: memosBackend.saveMemo(editor.memoId, editor.memoVersion,
                                                    titleInput.text, bodyInput.text)
                }
            }
        }
    }
}
