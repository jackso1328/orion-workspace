import { useState, useEffect } from "react";
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Placeholder from '@tiptap/extension-placeholder';
import { FileText, Plus, Search, Trash2 } from "lucide-react";
import { useOrionStore } from "../store/useOrionStore";
import { format } from "date-fns";

export default function NotesModule() {
  const documents = useOrionStore(state => state.documents.filter(d => d.type === 'md'));
  const addDocument = useOrionStore(state => state.addDocument);
  const updateDocument = useOrionStore(state => state.updateDocument);
  const deleteDocument = useOrionStore(state => state.deleteDocument);

  const [activeDocId, setActiveDocId] = useState<string | null>(documents[0]?.id || null);
  const [searchQuery, setSearchQuery] = useState("");

  const activeDoc = documents.find(d => d.id === activeDocId);

  // Filter documents based on search query
  const filteredDocuments = documents.filter(doc => 
    doc.filename.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const editor = useEditor({
    extensions: [
      StarterKit,
      Placeholder.configure({
        placeholder: "Press '/' for commands, or start typing...",
      }),
    ],
    content: activeDoc?.content || "",
    onUpdate: ({ editor }) => {
      if (activeDocId) {
        updateDocument(activeDocId, { content: editor.getHTML() });
      }
    },
  });

  // Sync editor content when switching active document
  useEffect(() => {
    if (editor && activeDoc) {
      editor.commands.setContent(activeDoc.content || "");
    } else if (editor && !activeDoc) {
      editor.commands.setContent("");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeDocId]);

  const handleCreateNote = () => {
    const newDocId = crypto.randomUUID();
    addDocument({
      id: newDocId,
      filename: "Untitled Note",
      type: "md",
      sizeBytes: 0,
      content: ""
    });
    setSearchQuery(""); // Clear search to ensure we see the new note
    setActiveDocId(newDocId);
  };

  const handleDeleteNote = () => {
    if (!activeDocId) return;
    
    // Switch to another document before deleting
    const currentIndex = documents.findIndex(d => d.id === activeDocId);
    let nextDocId = null;
    
    if (documents.length > 1) {
      if (currentIndex === 0) {
        nextDocId = documents[1].id;
      } else {
        nextDocId = documents[currentIndex - 1].id;
      }
    }
    
    deleteDocument(activeDocId);
    setActiveDocId(nextDocId);
  };

  const handleRename = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (activeDocId) {
      updateDocument(activeDocId, { filename: e.target.value });
    }
  };

  return (
    <div className="notes-module">
      
      {/* Left Sidebar for Documents */}
      <div className="notes-sidebar">
        <div className="notes-sidebar-header">
          <h2>Knowledge</h2>
          <button className="add-note-btn" onClick={handleCreateNote}>
            <Plus size={16} />
          </button>
        </div>
        
        <div className="notes-search">
          <Search size={14} />
          <input 
            type="text" 
            placeholder="Search notes..." 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>

        <div className="notes-list">
          {filteredDocuments.length === 0 ? (
            <div style={{ padding: '20px', textAlign: 'center', color: 'var(--text-muted)' }}>
              No notes found.
            </div>
          ) : (
            filteredDocuments.map(doc => (
              <div 
                key={doc.id} 
                className={`note-list-item ${activeDocId === doc.id ? 'active' : ''}`}
                onClick={() => setActiveDocId(doc.id)}
              >
                <FileText size={16} className="note-icon" />
                <div className="note-meta">
                  <span className="note-title">{doc.filename}</span>
                  <span className="note-date">{format(new Date(doc.uploadedAt), "MMM d, yyyy")}</span>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Main Editor Area */}
      <div className="notes-editor-area">
        {activeDoc ? (
          <div className="editor-container">
            <header className="editor-header">
              <input 
                type="text" 
                className="document-title-input" 
                value={activeDoc.filename}
                onChange={handleRename}
                placeholder="Untitled Note"
              />
              <button className="icon-btn delete-btn-header" onClick={handleDeleteNote}>
                <Trash2 size={20} />
              </button>
            </header>
            
            <div className="editor-canvas">
              <EditorContent editor={editor} />
            </div>
          </div>
        ) : (
          <div className="empty-editor-state">
            <FileText size={48} color="var(--border-card)" />
            <p>Select a note or create a new one to start writing.</p>
            <button className="btn-primary" onClick={handleCreateNote}>Create Note</button>
          </div>
        )}
      </div>
      
    </div>
  );
}
