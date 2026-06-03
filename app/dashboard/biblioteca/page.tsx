"use client";

import { motion } from "framer-motion";
import { useState, useRef, useEffect, useCallback } from "react";
import { Upload, Search, FileText, File, Image, Archive, Download, Trash2, Eye, FolderOpen, Loader2 } from "lucide-react";

const categories = ["Todas", "Evaluaciones", "Protocolos", "Guías", "Actividades", "Formularios"];

interface Doc {
  id: number;
  name: string;
  category: string;
  size: string;
  createdAt: string;
  type: string;
  url: string;
}

const fileIcons: Record<string, { icon: typeof FileText; color: string; bg: string }> = {
  pdf: { icon: FileText, color: "text-red-500", bg: "bg-red-50" },
  doc: { icon: File, color: "text-blue-500", bg: "bg-blue-50" },
  excel: { icon: Archive, color: "text-emerald-500", bg: "bg-emerald-50" },
  img: { icon: Image, color: "text-amber-500", bg: "bg-amber-50" },
  file: { icon: File, color: "text-slate-500", bg: "bg-slate-100" },
};

export default function BibliotecaPage() {
  const [category, setCategory] = useState("Todas");
  const [search, setSearch] = useState("");
  const [dragging, setDragging] = useState(false);
  const [documents, setDocuments] = useState<Doc[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [uploadCategory, setUploadCategory] = useState("Sin categoría");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const fetchDocuments = useCallback(async () => {
    try {
      const res = await fetch("/api/documents");
      if (res.ok) setDocuments(await res.json());
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchDocuments(); }, [fetchDocuments]);

  const handleFiles = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    setUploading(true);
    try {
      for (const file of Array.from(files)) {
        const fd = new FormData();
        fd.append("file", file);
        fd.append("category", uploadCategory);
        await fetch("/api/documents", { method: "POST", body: fd });
      }
      await fetchDocuments();
    } finally {
      setUploading(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragging(false);
    handleFiles(e.dataTransfer.files);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragging(true);
  };

  const deleteDoc = async (id: number) => {
    await fetch(`/api/documents/${id}`, { method: "DELETE" });
    setDocuments((prev) => prev.filter((d) => d.id !== id));
  };

  const viewDoc = (doc: Doc) => window.open(doc.url, "_blank");

  const downloadDoc = (doc: Doc) => {
    const a = document.createElement("a");
    a.href = doc.url;
    a.download = doc.name;
    a.click();
  };

  const filtered = documents.filter((d) => {
    const matchCat = category === "Todas" || d.category === category;
    const matchSearch = d.name.toLowerCase().includes(search.toLowerCase());
    return matchCat && matchSearch;
  });

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        multiple
        className="hidden"
        onChange={(e) => handleFiles(e.target.files)}
      />

      {/* Upload category selector */}
      <div className="flex items-center gap-2 text-sm text-slate-500">
        <span className="shrink-0">Categoría al subir:</span>
        <select
          value={uploadCategory}
          onChange={(e) => setUploadCategory(e.target.value)}
          className="border border-slate-200 rounded-lg px-2 py-1 text-sm text-slate-700 bg-white focus:outline-none focus:ring-2 focus:ring-violet-500/30"
        >
          {["Sin categoría", "Evaluaciones", "Protocolos", "Guías", "Actividades", "Formularios"].map((c) => (
            <option key={c}>{c}</option>
          ))}
        </select>
      </div>

      {/* Header toolbar */}
      <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="Buscar documentos..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-violet-500/30 focus:border-violet-400 transition-all"
          />
        </div>
        <button
          onClick={() => fileInputRef.current?.click()}
          disabled={uploading}
          className="flex items-center gap-2 bg-gradient-to-r from-violet-500 to-purple-600 text-white px-4 py-2.5 rounded-xl font-medium text-sm hover:from-violet-400 hover:to-purple-500 transition-all shadow-lg shadow-violet-500/30 shrink-0 disabled:opacity-60"
        >
          {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
          {uploading ? "Subiendo..." : "Subir Documento"}
        </button>
      </div>

      {/* Drop zone */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        onDragOver={handleDragOver}
        onDragLeave={(e) => { e.preventDefault(); setDragging(false); }}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
        className={`border-2 border-dashed rounded-2xl p-10 text-center transition-all cursor-pointer ${
          dragging
            ? "border-violet-400 bg-violet-50"
            : "border-slate-200 hover:border-violet-300 hover:bg-violet-50/30"
        }`}
      >
        <div className="w-14 h-14 bg-violet-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
          <Upload className="w-7 h-7 text-violet-500" />
        </div>
        <p className="font-semibold text-slate-700">Arrastra archivos aquí</p>
        <p className="text-sm text-slate-400 mt-1">o haz clic para seleccionar · PDF, Word, Excel, Imágenes</p>
        <p className="text-xs text-slate-400 mt-2">Tamaño máximo: 20MB por archivo</p>
      </motion.div>

      {/* Category filters */}
      <div className="flex flex-wrap gap-2">
        {categories.map((cat) => (
          <button
            key={cat}
            onClick={() => setCategory(cat)}
            className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${
              category === cat
                ? "bg-gradient-to-r from-violet-500 to-purple-600 text-white shadow-md shadow-violet-500/25"
                : "bg-white border border-slate-200 text-slate-600 hover:border-violet-300 hover:text-violet-700"
            }`}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* Documents grid */}
      {loading ? (
        <div className="flex justify-center py-20">
          <Loader2 className="w-8 h-8 animate-spin text-violet-400" />
        </div>
      ) : filtered.length === 0 ? (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="text-center py-20"
        >
          <FolderOpen className="w-16 h-16 mx-auto text-slate-200 mb-4" />
          <p className="font-semibold text-slate-500">No hay documentos</p>
          <p className="text-sm text-slate-400 mt-1">Sube tu primer documento para comenzar</p>
        </motion.div>
      ) : (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4"
        >
          {filtered.map((doc, i) => {
            const fIcon = fileIcons[doc.type] || fileIcons.pdf;
            return (
              <motion.div
                key={doc.id}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
                className="bg-white rounded-2xl border border-slate-200/60 p-4 hover:border-violet-200 hover:shadow-lg hover:shadow-violet-500/5 transition-all group"
              >
                <div className="flex items-start gap-3">
                  <div className={`w-12 h-12 ${fIcon.bg} rounded-xl flex items-center justify-center shrink-0`}>
                    <fIcon.icon className={`w-6 h-6 ${fIcon.color}`} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-slate-700 truncate">{doc.name}</p>
                    <p className="text-xs text-slate-400 mt-0.5">{doc.size} · {new Date(doc.createdAt).toLocaleDateString("es-CL", { day: "2-digit", month: "short", year: "numeric" })}</p>
                    <span className="inline-block mt-1.5 text-[11px] font-medium bg-slate-100 text-slate-500 px-2 py-0.5 rounded-lg">
                      {doc.category}
                    </span>
                  </div>
                </div>
                <div className="flex gap-2 mt-4 opacity-0 group-hover:opacity-100 transition-all">
                  <button
                    onClick={() => viewDoc(doc)}
                    className="flex-1 flex items-center justify-center gap-1.5 text-xs font-medium text-slate-600 hover:text-violet-600 bg-slate-100 hover:bg-violet-50 rounded-xl py-2 transition-colors"
                  >
                    <Eye className="w-3.5 h-3.5" /> Ver
                  </button>
                  <button
                    onClick={() => downloadDoc(doc)}
                    className="flex-1 flex items-center justify-center gap-1.5 text-xs font-medium text-slate-600 hover:text-violet-600 bg-slate-100 hover:bg-violet-50 rounded-xl py-2 transition-colors"
                  >
                    <Download className="w-3.5 h-3.5" /> Descargar
                  </button>
                  <button
                    onClick={() => deleteDoc(doc.id)}
                    className="flex items-center justify-center text-xs font-medium text-slate-400 hover:text-red-500 bg-slate-100 hover:bg-red-50 rounded-xl px-3 py-2 transition-colors"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </motion.div>
            );
          })}
        </motion.div>
      )}
    </div>
  );
}
