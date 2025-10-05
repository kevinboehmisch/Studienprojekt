// src/components/editor/EditorToolbar.tsx
'use client'
import { Editor } from '@tiptap/react'
import React from 'react'
import { 
  AlignLeft, 
  AlignCenter, 
  AlignRight, 
  Quote,
  Heading1,
  Heading2,
  Heading3,
  List,
  ListOrdered,
  Minus
} from 'lucide-react'

interface EditorToolbarProps {
  editor: Editor
}

const EditorToolbar: React.FC<EditorToolbarProps> = ({ editor }) => {
  if (!editor) {
    return null
  }

  return (
    <div className="flex flex-wrap items-center bg-gray-50 p-3 border-b border-gray-200 mb-2 text-sm gap-1">
      {/* Überschriften Gruppe */}
      <div className="flex items-center gap-1 mr-3">
        <button
          onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
          className={`flex items-center gap-1 px-3 py-2 rounded-md transition-colors ${
            editor.isActive('heading', { level: 1 }) 
              ? 'bg-blue-100 text-blue-700 border border-blue-200' 
              : 'hover:bg-gray-100 text-gray-700'
          }`}
          title="Überschrift 1"
        >
          <Heading1 size={16} />
          <span className="hidden sm:inline">H1</span>
        </button>
        <button
          onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
          className={`flex items-center gap-1 px-3 py-2 rounded-md transition-colors ${
            editor.isActive('heading', { level: 2 }) 
              ? 'bg-blue-100 text-blue-700 border border-blue-200' 
              : 'hover:bg-gray-100 text-gray-700'
          }`}
          title="Überschrift 2"
        >
          <Heading2 size={16} />
          <span className="hidden sm:inline">H2</span>
        </button>
        <button
          onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
          className={`flex items-center gap-1 px-3 py-2 rounded-md transition-colors ${
            editor.isActive('heading', { level: 3 }) 
              ? 'bg-blue-100 text-blue-700 border border-blue-200' 
              : 'hover:bg-gray-100 text-gray-700'
          }`}
          title="Überschrift 3"
        >
          <Heading3 size={16} />
          <span className="hidden sm:inline">H3</span>
        </button>
      </div>

      {/* Trennlinie */}
      <div className="w-px h-6 bg-gray-300 mx-2"></div>

      {/* Listen Gruppe */}
      <div className="flex items-center gap-1 mr-3">
        <button
          onClick={() => editor.chain().focus().toggleBulletList().run()}
          className={`flex items-center gap-1 px-3 py-2 rounded-md transition-colors ${
            editor.isActive('bulletList') 
              ? 'bg-blue-100 text-blue-700 border border-blue-200' 
              : 'hover:bg-gray-100 text-gray-700'
          }`}
          title="Aufzählungsliste"
        >
          <List size={16} />
          <span className="hidden sm:inline">Liste</span>
        </button>
        <button
          onClick={() => editor.chain().focus().toggleOrderedList().run()}
          className={`flex items-center gap-1 px-3 py-2 rounded-md transition-colors ${
            editor.isActive('orderedList') 
              ? 'bg-blue-100 text-blue-700 border border-blue-200' 
              : 'hover:bg-gray-100 text-gray-700'
          }`}
          title="Nummerierte Liste"
        >
          <ListOrdered size={16} />
          <span className="hidden sm:inline">1. Liste</span>
        </button>
      </div>

      {/* Trennlinie */}
      <div className="w-px h-6 bg-gray-300 mx-2"></div>

      {/* Textausrichtung Gruppe */}
      <div className="flex items-center gap-1 mr-3">
        <button
          onClick={() => editor.chain().focus().setTextAlign('left').run()}
          className={`flex items-center gap-1 px-3 py-2 rounded-md transition-colors ${
            editor.isActive({ textAlign: 'left' }) || (!editor.isActive({ textAlign: 'center' }) && !editor.isActive({ textAlign: 'right' }))
              ? 'bg-blue-100 text-blue-700 border border-blue-200' 
              : 'hover:bg-gray-100 text-gray-700'
          }`}
          title="Linksbündig"
        >
          <AlignLeft size={16} />
          <span className="hidden lg:inline"></span>
        </button>
        <button
          onClick={() => editor.chain().focus().setTextAlign('center').run()}
          className={`flex items-center gap-1 px-3 py-2 rounded-md transition-colors ${
            editor.isActive({ textAlign: 'center' }) 
              ? 'bg-blue-100 text-blue-700 border border-blue-200' 
              : 'hover:bg-gray-100 text-gray-700'
          }`}
          title="Zentriert"
        >
          <AlignCenter size={16} />
          <span className="hidden lg:inline"></span>
        </button>
        <button
          onClick={() => editor.chain().focus().setTextAlign('right').run()}
          className={`flex items-center gap-1 px-3 py-2 rounded-md transition-colors ${
            editor.isActive({ textAlign: 'right' }) 
              ? 'bg-blue-100 text-blue-700 border border-blue-200' 
              : 'hover:bg-gray-100 text-gray-700'
          }`}
          title="Rechtsbündig"
        >
          <AlignRight size={16} />
          <span className="hidden lg:inline"></span>
        </button>
      </div>

      {/* Trennlinie */}
      <div className="w-px h-6 bg-gray-300 mx-2"></div>

      {/* Blocktext und weitere Formatierungen */}
      <div className="flex items-center gap-1">
        <button
          onClick={() => editor.chain().focus().toggleBlockquote().run()}
          className={`flex items-center gap-1 px-3 py-2 rounded-md transition-colors ${
            editor.isActive('blockquote') 
              ? 'bg-blue-100 text-blue-700 border border-blue-200' 
              : 'hover:bg-gray-100 text-gray-700'
          }`}
          title="Blockzitat"
        >
          <Quote size={16} />
          <span className="hidden sm:inline">Zitat</span>
        </button>
        <button
          onClick={() => editor.chain().focus().setHorizontalRule().run()}
          className="flex items-center gap-1 px-3 py-2 rounded-md transition-colors hover:bg-gray-100 text-gray-700"
          title="Horizontale Linie"
        >
          <Minus size={16} />
          <span className="hidden sm:inline">Linie</span>
        </button>
      </div>
    </div>
  )
}

export default EditorToolbar