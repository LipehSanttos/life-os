"use client";
import React, { useState, useEffect } from "react";
import {
  BookOpen,
  Plus,
  BookMarked,
  Search,
  Sparkles,
  Image as ImageIcon,
  CheckCircle2,
  Trash2,
  Edit3,
  BookmarkPlus,
  ExternalLink,
  BookCopy,
} from "lucide-react";
import { BookData } from "@/types";
import { toast } from "sonner";

export default function ReadingPage() {
  const [books, setBooks] = useState<BookData[]>([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [selectedBook, setSelectedBook] = useState<BookData | null>(null);

  // Form State
  const [isbnSearch, setIsbnSearch] = useState("");
  const [title, setTitle] = useState("");
  const [author, setAuthor] = useState("");
  const [isbn, setIsbn] = useState("");
  const [coverUrl, setCoverUrl] = useState("");
  const [totalPages, setTotalPages] = useState(250);
  const [currentPage, setCurrentPage] = useState(0);

  const [loading, setLoading] = useState(false);
  const [searchingIsbn, setSearchingIsbn] = useState(false);

  const loadData = async () => {
    try {
      const res = await fetch("/api/reading");
      if (res.ok) setBooks(await res.json());
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Search by ISBN or Title via Google Books & Open Library
  const handleSearchIsbn = async () => {
    if (!isbnSearch.trim()) {
      toast.error("Digite um ISBN ou título para buscar.");
      return;
    }

    setSearchingIsbn(true);
    try {
      const res = await fetch(`/api/books/isbn?isbn=${encodeURIComponent(isbnSearch.trim())}`);
      const data = await res.json();

      if (!res.ok || !data.found) {
        toast.info(data.message || "Livro não encontrado automaticamente. Preencha os dados abaixo.");
        return;
      }

      setTitle(data.title || "");
      if (data.author) setAuthor(data.author);
      if (data.totalPages) setTotalPages(data.totalPages);
      if (data.isbn) setIsbn(data.isbn);
      if (data.coverUrl) setCoverUrl(data.coverUrl);

      toast.success(`Encontrado: "${data.title}"! Capa e detalhes carregados.`);
    } catch (err: any) {
      toast.error("Erro ao buscar dados do livro.");
    } finally {
      setSearchingIsbn(false);
    }
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      toast.error("O título do livro é obrigatório.");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/reading", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: title.trim(),
          author: author.trim() || null,
          isbn: isbn.trim() || null,
          coverUrl: coverUrl.trim() || null,
          totalPages: Number(totalPages) || 100,
        }),
      });

      if (!res.ok) throw new Error("Erro ao adicionar livro.");

      toast.success("Livro adicionado à sua biblioteca com sucesso! 📚");
      resetForm();
      setModalOpen(false);
      loadData();
    } catch (err: any) {
      toast.error(err.message || "Falha ao salvar livro.");
    } finally {
      setLoading(false);
    }
  };

  const handleEditSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedBook) return;

    setLoading(true);
    try {
      const nextProgress = Math.min(Math.round((currentPage / totalPages) * 100), 100);
      const res = await fetch(`/api/reading/${selectedBook.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: title.trim(),
          author: author.trim() || null,
          isbn: isbn.trim() || null,
          coverUrl: coverUrl.trim() || null,
          totalPages: Number(totalPages),
          currentPage: Number(currentPage),
          progress: nextProgress,
          status: nextProgress === 100 ? "COMPLETED" : "READING",
        }),
      });

      if (!res.ok) throw new Error("Erro ao atualizar livro.");

      toast.success("Livro atualizado com sucesso!");
      setEditModalOpen(false);
      setSelectedBook(null);
      loadData();
    } catch (err: any) {
      toast.error(err.message || "Falha ao salvar edições.");
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Tem certeza que deseja remover este livro da sua biblioteca?")) return;

    try {
      await fetch(`/api/reading/${id}`, { method: "DELETE" });
      toast.success("Livro removido da biblioteca.");
      loadData();
    } catch {
      toast.error("Erro ao excluir livro.");
    }
  };

  const handleAddPages = async (book: BookData, count: number) => {
    const nextPages = Math.min(book.currentPage + count, book.totalPages);
    const nextProgress = Math.round((nextPages / book.totalPages) * 100);

    try {
      await fetch(`/api/reading/${book.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          currentPage: nextPages,
          progress: nextProgress,
          status: nextProgress === 100 ? "COMPLETED" : "READING",
        }),
      });

      toast.success(`Progresso registrado: +${count} páginas! 📖`);
      loadData();
    } catch {
      toast.error("Erro ao registrar leitura.");
    }
  };

  const openEditModal = (book: BookData) => {
    setSelectedBook(book);
    setTitle(book.title);
    setAuthor(book.author || "");
    setIsbn(book.isbn || "");
    setCoverUrl(book.coverUrl || "");
    setTotalPages(book.totalPages);
    setCurrentPage(book.currentPage);
    setEditModalOpen(true);
  };

  const resetForm = () => {
    setIsbnSearch("");
    setTitle("");
    setAuthor("");
    setIsbn("");
    setCoverUrl("");
    setTotalPages(250);
    setCurrentPage(0);
  };

  return (
    <div className="max-w-7xl mx-auto space-y-6 pb-20">
      {/* Header */}
      <div className="p-6 sm:p-8 rounded-3xl border border-border/70 bg-card/80 backdrop-blur-xl shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-primary font-bold text-sm uppercase tracking-wider mb-2">
            <BookMarked className="w-5 h-5 text-amber-500" />
            <span>Biblioteca Pessoal & Leitura</span>
          </div>
          <h1 className="text-2xl sm:text-3xl lg:text-4xl font-black tracking-tight text-foreground">
            Meus Livros & Leituras
          </h1>
          <p className="text-sm sm:text-base text-muted-foreground mt-1.5 font-medium">
            Busque livros por ISBN ou adicione suas próprias capas e acompanhe seu progresso diário.
          </p>
        </div>

        <button
          onClick={() => {
            resetForm();
            setModalOpen(true);
          }}
          className="flex items-center gap-2 px-5 py-3 rounded-2xl bg-primary hover:bg-primary/90 text-primary-foreground font-bold text-sm shadow-md shadow-primary/25 active:scale-95 transition-all self-start md:self-auto"
        >
          <Plus className="w-4 h-4 stroke-[3]" />
          <span>Adicionar Livro</span>
        </button>
      </div>

      {/* Books Grid */}
      {books.length === 0 ? (
        <div className="p-12 text-center rounded-3xl border border-dashed border-border/80 bg-card/40 space-y-4">
          <div className="inline-flex p-4 rounded-2xl bg-amber-500/15 text-amber-500 mb-2">
            <BookCopy className="w-8 h-8" />
          </div>
          <h3 className="text-lg font-black text-foreground">Sua estante está vazia</h3>
          <p className="text-sm text-muted-foreground max-w-md mx-auto">
            Adicione seus livros favoritos informando o ISBN ou buscando a capa na internet para começar seu registro de leitura.
          </p>
          <button
            onClick={() => {
              resetForm();
              setModalOpen(true);
            }}
            className="px-6 py-2.5 rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground font-bold text-sm shadow-sm inline-flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            <span>Cadastrar Meu Primeiro Livro</span>
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {books.map((book) => {
            const isCompleted = book.currentPage >= book.totalPages;

            return (
              <div
                key={book.id}
                className="p-5 rounded-3xl border border-border/70 bg-card/90 backdrop-blur-xl shadow-xs flex flex-col justify-between space-y-4 hover:border-amber-500/40 transition-all group"
              >
                {/* Book Cover + Info */}
                <div className="space-y-3.5">
                  <div className="relative w-full h-56 rounded-2xl overflow-hidden bg-muted/60 border border-border/50 flex items-center justify-center shadow-inner group-hover:shadow-md transition-all">
                    {book.coverUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={book.coverUrl}
                        alt={book.title}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                        onError={(e) => {
                          // Fallback to placeholder icon if image link fails
                          (e.target as HTMLElement).style.display = "none";
                        }}
                      />
                    ) : (
                      <div className="w-full h-full p-6 flex flex-col items-center justify-center text-center bg-gradient-to-tr from-amber-500/20 via-primary/10 to-indigo-500/20">
                        <BookOpen className="w-12 h-12 text-amber-500/60 mb-2" />
                        <span className="text-xs font-bold text-foreground/80 line-clamp-2">{book.title}</span>
                      </div>
                    )}

                    {/* Progress Badge */}
                    <div className="absolute top-3 right-3">
                      <span
                        className={`text-xs font-black px-2.5 py-1 rounded-xl backdrop-blur-md shadow-sm border ${
                          isCompleted
                            ? "bg-emerald-500/90 text-white border-emerald-400"
                            : "bg-black/60 text-amber-300 border-white/20"
                        }`}
                      >
                        {book.progress}%
                      </span>
                    </div>

                    {/* Edit/Delete Hover Actions */}
                    <div className="absolute bottom-2 right-2 flex gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity bg-black/60 backdrop-blur-md p-1 rounded-xl">
                      <button
                        onClick={() => openEditModal(book)}
                        className="p-1.5 rounded-lg text-white/80 hover:text-white hover:bg-white/20 transition-all"
                        title="Editar livro"
                      >
                        <Edit3 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDelete(book.id)}
                        className="p-1.5 rounded-lg text-rose-400 hover:text-rose-300 hover:bg-rose-500/20 transition-all"
                        title="Excluir livro"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  <div>
                    <h3 className="font-black text-base text-foreground leading-snug line-clamp-2 group-hover:text-amber-500 transition-colors">
                      {book.title}
                    </h3>
                    <p className="text-xs text-muted-foreground font-semibold mt-1 truncate">
                      {book.author || "Autor não informado"}
                    </p>
                    {book.isbn && (
                      <span className="text-[10px] text-muted-foreground/70 font-mono block mt-0.5">
                        ISBN: {book.isbn}
                      </span>
                    )}
                  </div>
                </div>

                {/* Reading Progress */}
                <div className="space-y-3 pt-2 border-t border-border/40">
                  <div className="flex items-center justify-between text-xs text-muted-foreground font-bold">
                    <span>
                      Página <strong>{book.currentPage}</strong> de {book.totalPages}
                    </span>
                    <span>{isCompleted ? "✅ Concluído" : `${book.totalPages - book.currentPage} restando`}</span>
                  </div>

                  <div className="w-full h-2.5 rounded-full bg-border/70 overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-500 ${
                        isCompleted ? "bg-emerald-500" : "bg-gradient-to-r from-amber-500 to-orange-400"
                      }`}
                      style={{ width: `${book.progress}%` }}
                    />
                  </div>

                  {/* Quick Action Buttons */}
                  <div className="flex gap-2 pt-1">
                    <button
                      onClick={() => handleAddPages(book, 5)}
                      disabled={isCompleted}
                      className="flex-1 py-2 rounded-xl bg-muted hover:bg-muted/80 text-foreground text-xs font-bold transition-all disabled:opacity-40"
                    >
                      +5 págs
                    </button>
                    <button
                      onClick={() => handleAddPages(book, 20)}
                      disabled={isCompleted}
                      className="flex-1 py-2 rounded-xl bg-amber-500/15 hover:bg-amber-500/25 text-amber-500 text-xs font-bold transition-all disabled:opacity-40"
                    >
                      +20 págs
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Modal: Adicionar Novo Livro */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs animate-fade-in overflow-y-auto">
          <div className="w-full max-w-xl rounded-3xl border border-border/80 bg-card p-6 sm:p-8 space-y-5 shadow-2xl my-8">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-3 rounded-2xl bg-amber-500/15 text-amber-500">
                  <BookOpen className="w-6 h-6" />
                </div>
                <div>
                  <h2 className="text-xl font-black text-foreground">Adicionar Novo Livro</h2>
                  <p className="text-xs text-muted-foreground font-medium">
                    Busque automaticamente pelo ISBN ou preencha manualmente
                  </p>
                </div>
              </div>
            </div>

            {/* ISBN Auto Search Box */}
            <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/25 space-y-2">
              <label className="block text-xs font-bold text-amber-500 uppercase tracking-wider flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5" />
                <span>Busca Rápida por ISBN / Título</span>
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={isbnSearch}
                  onChange={(e) => setIsbnSearch(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      handleSearchIsbn();
                    }
                  }}
                  placeholder="Ex: 9788539004119 ou O Poder do Hábito"
                  className="flex-1 px-4 py-2.5 rounded-xl border border-border/70 bg-background text-foreground text-xs outline-none focus:ring-2 focus:ring-amber-500/40 font-medium"
                />
                <button
                  type="button"
                  onClick={handleSearchIsbn}
                  disabled={searchingIsbn || !isbnSearch.trim()}
                  className="px-4 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-white font-bold text-xs shadow-xs disabled:opacity-50 transition-all flex items-center gap-1.5"
                >
                  <Search className="w-3.5 h-3.5" />
                  <span>{searchingIsbn ? "Buscando..." : "Buscar"}</span>
                </button>
              </div>
            </div>

            <form onSubmit={handleCreate} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="sm:col-span-2">
                  <label className="block text-xs font-bold text-foreground mb-1.5">Título do Livro *</label>
                  <input
                    type="text"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="Ex: O Poder do Hábito"
                    className="w-full px-4 py-2.5 rounded-xl border border-border/70 bg-background text-foreground text-xs outline-none focus:ring-2 focus:ring-primary/40 font-semibold"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-foreground mb-1.5">Autor</label>
                  <input
                    type="text"
                    value={author}
                    onChange={(e) => setAuthor(e.target.value)}
                    placeholder="Ex: Charles Duhigg"
                    className="w-full px-4 py-2.5 rounded-xl border border-border/70 bg-background text-foreground text-xs outline-none focus:ring-2 focus:ring-primary/40 font-medium"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-foreground mb-1.5">ISBN (Opcional)</label>
                  <input
                    type="text"
                    value={isbn}
                    onChange={(e) => setIsbn(e.target.value)}
                    placeholder="Ex: 9788539004119"
                    className="w-full px-4 py-2.5 rounded-xl border border-border/70 bg-background text-foreground text-xs outline-none focus:ring-2 focus:ring-primary/40 font-mono"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-foreground mb-1.5">Total de Páginas</label>
                  <input
                    type="number"
                    min="1"
                    max="10000"
                    value={totalPages}
                    onChange={(e) => setTotalPages(Number(e.target.value))}
                    className="w-full px-4 py-2.5 rounded-xl border border-border/70 bg-background text-foreground text-xs outline-none focus:ring-2 focus:ring-primary/40 font-semibold"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-foreground mb-1.5 flex items-center gap-1.5">
                    <ImageIcon className="w-3.5 h-3.5 text-primary" />
                    <span>Link da Imagem da Capa</span>
                  </label>
                  <input
                    type="url"
                    value={coverUrl}
                    onChange={(e) => setCoverUrl(e.target.value)}
                    placeholder="https://exemplo.com/capa.jpg"
                    className="w-full px-4 py-2.5 rounded-xl border border-border/70 bg-background text-foreground text-xs outline-none focus:ring-2 focus:ring-primary/40 font-medium"
                  />
                </div>
              </div>

              {/* Cover Preview */}
              {coverUrl && (
                <div className="p-3 rounded-2xl border border-border/60 bg-muted/30 flex items-center gap-4">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={coverUrl}
                    alt="Prévia da Capa"
                    className="w-14 h-20 object-cover rounded-lg border border-border/70 shadow-sm"
                  />
                  <div className="flex-1 text-xs text-muted-foreground">
                    <span className="font-bold text-foreground block">Prévia da Capa Selecionada</span>
                    <span className="text-[11px] truncate block max-w-xs">{coverUrl}</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setCoverUrl("")}
                    className="text-xs text-rose-400 hover:underline font-bold"
                  >
                    Remover
                  </button>
                </div>
              )}

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-border/40">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="px-5 py-2.5 rounded-xl text-xs font-bold text-muted-foreground hover:bg-muted"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={loading || !title.trim()}
                  className="px-6 py-2.5 rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground font-black text-xs shadow-md shadow-primary/25 disabled:opacity-50"
                >
                  {loading ? "Salvando..." : "Salvar Livro"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Editar Livro */}
      {editModalOpen && selectedBook && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs animate-fade-in overflow-y-auto">
          <div className="w-full max-w-xl rounded-3xl border border-border/80 bg-card p-6 sm:p-8 space-y-5 shadow-2xl my-8">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-3 rounded-2xl bg-primary/15 text-primary">
                  <Edit3 className="w-6 h-6" />
                </div>
                <div>
                  <h2 className="text-xl font-black text-foreground">Editar Detalhes do Livro</h2>
                  <p className="text-xs text-muted-foreground font-medium">
                    Atualize o título, páginas lidas, ISBN ou capa
                  </p>
                </div>
              </div>
            </div>

            <form onSubmit={handleEditSave} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="sm:col-span-2">
                  <label className="block text-xs font-bold text-foreground mb-1.5">Título do Livro *</label>
                  <input
                    type="text"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-xl border border-border/70 bg-background text-foreground text-xs outline-none focus:ring-2 focus:ring-primary/40 font-semibold"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-foreground mb-1.5">Autor</label>
                  <input
                    type="text"
                    value={author}
                    onChange={(e) => setAuthor(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-xl border border-border/70 bg-background text-foreground text-xs outline-none focus:ring-2 focus:ring-primary/40 font-medium"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-foreground mb-1.5">ISBN</label>
                  <input
                    type="text"
                    value={isbn}
                    onChange={(e) => setIsbn(e.target.value)}
                    placeholder="Ex: 9788539004119"
                    className="w-full px-4 py-2.5 rounded-xl border border-border/70 bg-background text-foreground text-xs outline-none focus:ring-2 focus:ring-primary/40 font-mono"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-foreground mb-1.5">Página Atual</label>
                  <input
                    type="number"
                    min="0"
                    max={totalPages}
                    value={currentPage}
                    onChange={(e) => setCurrentPage(Number(e.target.value))}
                    className="w-full px-4 py-2.5 rounded-xl border border-border/70 bg-background text-foreground text-xs outline-none focus:ring-2 focus:ring-primary/40 font-semibold"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-foreground mb-1.5">Total de Páginas</label>
                  <input
                    type="number"
                    min="1"
                    max="10000"
                    value={totalPages}
                    onChange={(e) => setTotalPages(Number(e.target.value))}
                    className="w-full px-4 py-2.5 rounded-xl border border-border/70 bg-background text-foreground text-xs outline-none focus:ring-2 focus:ring-primary/40 font-semibold"
                    required
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-xs font-bold text-foreground mb-1.5 flex items-center gap-1.5">
                    <ImageIcon className="w-3.5 h-3.5 text-primary" />
                    <span>Link da Imagem da Capa</span>
                  </label>
                  <input
                    type="url"
                    value={coverUrl}
                    onChange={(e) => setCoverUrl(e.target.value)}
                    placeholder="https://exemplo.com/capa.jpg"
                    className="w-full px-4 py-2.5 rounded-xl border border-border/70 bg-background text-foreground text-xs outline-none focus:ring-2 focus:ring-primary/40 font-medium"
                  />
                </div>
              </div>

              {/* Cover Preview */}
              {coverUrl && (
                <div className="p-3 rounded-2xl border border-border/60 bg-muted/30 flex items-center gap-4">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={coverUrl}
                    alt="Prévia da Capa"
                    className="w-14 h-20 object-cover rounded-lg border border-border/70 shadow-sm"
                  />
                  <div className="flex-1 text-xs text-muted-foreground">
                    <span className="font-bold text-foreground block">Prévia da Capa Selecionada</span>
                    <span className="text-[11px] truncate block max-w-xs">{coverUrl}</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setCoverUrl("")}
                    className="text-xs text-rose-400 hover:underline font-bold"
                  >
                    Remover
                  </button>
                </div>
              )}

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-border/40">
                <button
                  type="button"
                  onClick={() => setEditModalOpen(false)}
                  className="px-5 py-2.5 rounded-xl text-xs font-bold text-muted-foreground hover:bg-muted"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={loading || !title.trim()}
                  className="px-6 py-2.5 rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground font-black text-xs shadow-md shadow-primary/25 disabled:opacity-50"
                >
                  {loading ? "Salvando..." : "Salvar Alterações"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
