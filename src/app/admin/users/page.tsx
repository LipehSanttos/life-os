"use client";
import React, { useState, useEffect } from "react";
import {
  ShieldCheck,
  UserPlus,
  Users,
  UserCheck,
  Trash2,
  Edit2,
  Lock,
  Mail,
  User as UserIcon,
  Eye,
  EyeOff,
} from "lucide-react";
import { toast } from "sonner";
import { formatDate } from "@/lib/utils";

interface UserProfile {
  id: string;
  name: string;
  email: string;
  role: "ADMIN" | "USER";
  avatarUrl?: string | null;
  createdAt: string;
  updatedAt: string;
}

export default function AdminUsersPage() {
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState<UserProfile | null>(null);

  // Modals state
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<UserProfile | null>(null);

  // Form states - Create
  const [newName, setNewName] = useState("");
  const [newEmail, setNewEmail] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [newRole, setNewRole] = useState<"ADMIN" | "USER">("USER");
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Form states - Edit
  const [editName, setEditName] = useState("");
  const [editEmail, setEditEmail] = useState("");
  const [editRole, setEditRole] = useState<"ADMIN" | "USER">("USER");
  const [editPassword, setEditPassword] = useState("");

  const loadData = async () => {
    try {
      setLoading(true);
      const [usersRes, meRes] = await Promise.all([
        fetch("/api/admin/users"),
        fetch("/api/auth/me"),
      ]);

      if (meRes.ok) {
        const meData = await meRes.json();
        setCurrentUser(meData.user);
      }

      if (usersRes.ok) {
        setUsers(await usersRes.json());
      } else {
        const err = await usersRes.json();
        toast.error(err.error || "Acesso negado.");
      }
    } catch (e) {
      toast.error("Erro ao carregar lista de usuários.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim() || !newEmail.trim() || !newPassword.trim()) {
      toast.error("Por favor, preencha todos os campos obrigatórios.");
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch("/api/admin/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: newName.trim(),
          email: newEmail.trim(),
          password: newPassword,
          role: newRole,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Falha ao criar usuário.");

      toast.success(`Usuário ${data.name} criado com sucesso! 🎉`);
      setNewName("");
      setNewEmail("");
      setNewPassword("");
      setNewRole("USER");
      setCreateModalOpen(false);
      loadData();
    } catch (err: any) {
      toast.error(err.message || "Erro ao cadastrar usuário.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUser) return;

    setSubmitting(true);
    try {
      const body: any = {
        name: editName.trim(),
        email: editEmail.trim(),
        role: editRole,
      };
      if (editPassword.trim()) {
        body.password = editPassword.trim();
      }

      const res = await fetch(`/api/admin/users/${selectedUser.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Falha ao atualizar usuário.");

      toast.success("Perfil de usuário atualizado com sucesso!");
      setEditModalOpen(false);
      setSelectedUser(null);
      setEditPassword("");
      loadData();
    } catch (err: any) {
      toast.error(err.message || "Erro ao salvar alterações.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (user: UserProfile) => {
    if (user.id === currentUser?.id) {
      toast.error("Você não pode excluir sua própria conta de administrador.");
      return;
    }

    if (!confirm(`Tem certeza que deseja excluir permanentemente o usuário "${user.name}" (${user.email})?`)) {
      return;
    }

    try {
      const res = await fetch(`/api/admin/users/${user.id}`, {
        method: "DELETE",
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Erro ao excluir.");
      }

      toast.success(`Usuário "${user.name}" removido.`);
      loadData();
    } catch (err: any) {
      toast.error(err.message || "Falha ao excluir usuário.");
    }
  };

  const openEditModal = (user: UserProfile) => {
    setSelectedUser(user);
    setEditName(user.name);
    setEditEmail(user.email);
    setEditRole(user.role);
    setEditPassword("");
    setEditModalOpen(true);
  };

  const adminCount = users.filter((u) => u.role === "ADMIN").length;
  const standardCount = users.filter((u) => u.role === "USER").length;

  return (
    <div className="max-w-6xl mx-auto space-y-8 pb-16">
      {/* Header Banner */}
      <div className="p-6 sm:p-8 rounded-3xl border border-border/70 bg-card/80 backdrop-blur-xl shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <div className="flex items-center gap-2 text-indigo-400 font-bold text-sm uppercase tracking-wider mb-2">
            <ShieldCheck className="w-5 h-5" />
            <span>Painel do Administrador</span>
          </div>
          <h1 className="text-2xl sm:text-3xl lg:text-4xl font-black tracking-tight text-foreground">
            Gestão de Usuários & Perfis
          </h1>
          <p className="text-sm sm:text-base text-muted-foreground mt-1.5 font-medium max-w-2xl">
            Crie novos usuários, defina privilégios de acesso e gerencie credenciais de segurança do Life OS.
          </p>
        </div>

        <button
          onClick={() => setCreateModalOpen(true)}
          className="flex items-center gap-2.5 px-6 py-3.5 rounded-2xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-sm shadow-lg shadow-indigo-600/30 active:scale-95 transition-all self-start md:self-auto"
        >
          <UserPlus className="w-5 h-5 stroke-[2.5]" />
          <span>Criar Novo Usuário</span>
        </button>
      </div>

      {/* Metrics Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
        <div className="p-6 rounded-3xl border border-border/70 bg-card/80 backdrop-blur-xl shadow-xs flex items-center gap-4">
          <div className="p-3.5 rounded-2xl bg-indigo-500/15 text-indigo-400">
            <Users className="w-6 h-6" />
          </div>
          <div>
            <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground block">
              Total de Contas
            </span>
            <span className="text-2xl sm:text-3xl font-black text-foreground">{users.length}</span>
          </div>
        </div>

        <div className="p-6 rounded-3xl border border-border/70 bg-card/80 backdrop-blur-xl shadow-xs flex items-center gap-4">
          <div className="p-3.5 rounded-2xl bg-purple-500/15 text-purple-400">
            <ShieldCheck className="w-6 h-6" />
          </div>
          <div>
            <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground block">
              Administradores
            </span>
            <span className="text-2xl sm:text-3xl font-black text-purple-400">{adminCount}</span>
          </div>
        </div>

        <div className="p-6 rounded-3xl border border-border/70 bg-card/80 backdrop-blur-xl shadow-xs flex items-center gap-4">
          <div className="p-3.5 rounded-2xl bg-blue-500/15 text-blue-400">
            <UserCheck className="w-6 h-6" />
          </div>
          <div>
            <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground block">
              Usuários Padrão
            </span>
            <span className="text-2xl sm:text-3xl font-black text-blue-400">{standardCount}</span>
          </div>
        </div>
      </div>

      {/* Users List */}
      <div className="p-6 sm:p-8 rounded-3xl border border-border/70 bg-card/80 backdrop-blur-xl shadow-xs space-y-6">
        <div className="flex items-center justify-between pb-4 border-b border-border/40">
          <div>
            <h2 className="text-xl font-black text-foreground">Perfis de Usuários Cadastrados</h2>
            <p className="text-xs sm:text-sm text-muted-foreground font-medium mt-0.5">
              Lista de todos os usuários com acesso ao sistema
            </p>
          </div>
          <span className="text-xs font-bold px-3 py-1 rounded-full bg-muted text-muted-foreground">
            {users.length} cadastrados
          </span>
        </div>

        {loading ? (
          <div className="py-16 text-center text-muted-foreground font-medium animate-pulse">
            Carregando usuários...
          </div>
        ) : users.length === 0 ? (
          <div className="py-16 text-center text-muted-foreground font-medium">
            Nenhum usuário encontrado.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {users.map((u) => {
              const isAdmin = u.role === "ADMIN";
              const isSelf = u.id === currentUser?.id;

              return (
                <div
                  key={u.id}
                  className="p-5 rounded-2xl border border-border/70 bg-background/60 backdrop-blur-sm flex flex-col justify-between space-y-4 hover:border-indigo-500/40 transition-all shadow-xs"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3.5">
                      <div
                        className={`w-12 h-12 rounded-2xl flex items-center justify-center font-black text-base shadow-sm ${
                          isAdmin
                            ? "bg-gradient-to-tr from-purple-600 to-indigo-500 text-white shadow-purple-500/20"
                            : "bg-blue-600/20 text-blue-400 border border-blue-500/30"
                        }`}
                      >
                        {u.name
                          .split(" ")
                          .map((n) => n[0])
                          .slice(0, 2)
                          .join("")
                          .toUpperCase()}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="font-black text-base text-foreground leading-tight">{u.name}</h3>
                          {isSelf && (
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-indigo-500/15 text-indigo-400 border border-indigo-500/25">
                              Você
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground font-medium mt-0.5">{u.email}</p>
                      </div>
                    </div>

                    <span
                      className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black uppercase tracking-wider border ${
                        isAdmin
                          ? "bg-purple-500/15 text-purple-400 border-purple-500/30"
                          : "bg-blue-500/15 text-blue-400 border-blue-500/30"
                      }`}
                    >
                      {isAdmin ? <ShieldCheck className="w-3.5 h-3.5" /> : <UserCheck className="w-3.5 h-3.5" />}
                      <span>{isAdmin ? "Admin" : "Usuário"}</span>
                    </span>
                  </div>

                  <div className="pt-3 border-t border-border/40 flex items-center justify-between text-xs text-muted-foreground font-semibold">
                    <span>Cadastrado em {formatDate(u.createdAt)}</span>

                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => openEditModal(u)}
                        className="p-2 rounded-xl text-muted-foreground hover:text-indigo-400 hover:bg-indigo-500/10 transition-colors"
                        title="Editar usuário e redefinir senha"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>

                      {!isSelf && (
                        <button
                          onClick={() => handleDelete(u)}
                          className="p-2 rounded-xl text-muted-foreground hover:text-rose-500 hover:bg-rose-500/10 transition-colors"
                          title="Excluir usuário"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Modal: Criar Novo Usuário */}
      {createModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs animate-fade-in">
          <div className="w-full max-w-lg rounded-3xl border border-border/80 bg-card p-6 sm:p-8 space-y-6 shadow-2xl">
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-2xl bg-indigo-500/15 text-indigo-400">
                <UserPlus className="w-6 h-6" />
              </div>
              <div>
                <h2 className="text-xl font-black text-foreground">Criar Novo Perfil de Usuário</h2>
                <p className="text-xs text-muted-foreground font-medium">
                  Cadastre um novo usuário com privilégios específicos
                </p>
              </div>
            </div>

            <form onSubmit={handleCreate} className="space-y-4">
              <div>
                <label className="block text-sm font-bold text-foreground mb-1.5">Nome Completo *</label>
                <div className="relative">
                  <UserIcon className="w-5 h-5 absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
                  <input
                    type="text"
                    value={newName}
                    onChange={(e) => setNewName(e.target.value)}
                    placeholder="Ex: Carlos Silva"
                    className="w-full pl-11 pr-4 py-3 rounded-xl border border-border/70 bg-background text-foreground text-sm outline-none focus:ring-2 focus:ring-indigo-500/40 font-semibold"
                    required
                    autoFocus
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-bold text-foreground mb-1.5">Usuário ou E-mail para Login *</label>
                <div className="relative">
                  <Mail className="w-5 h-5 absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
                  <input
                    type="text"
                    value={newEmail}
                    onChange={(e) => {
                      const sanitized = e.target.value.replace(/[^a-zA-Z0-9.@]/g, "");
                      setNewEmail(sanitized);
                    }}
                    placeholder="Ex: carlos.silva ou carlos@empresa.com"
                    className="w-full pl-11 pr-4 py-3 rounded-xl border border-border/70 bg-background text-foreground text-sm outline-none focus:ring-2 focus:ring-indigo-500/40 font-semibold"
                    required
                  />
                </div>
                <p className="text-[11px] text-muted-foreground mt-1 font-medium">
                  Aceita apenas letras, números e ponto (.) sem espaços.
                </p>
              </div>

              <div>
                <label className="block text-sm font-bold text-foreground mb-1.5">Senha Inicial *</label>
                <div className="relative">
                  <Lock className="w-5 h-5 absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
                  <input
                    type={showPassword ? "text" : "password"}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="Mínimo 6 caracteres"
                    className="w-full pl-11 pr-11 py-3 rounded-xl border border-border/70 bg-background text-foreground text-sm outline-none focus:ring-2 focus:ring-indigo-500/40 font-semibold"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* Privilege Selection */}
              <div className="space-y-2 pt-1">
                <label className="block text-sm font-bold text-foreground">Perfil de Privilégios *</label>
                <div className="grid grid-cols-2 gap-3">
                  <label
                    className={`p-4 rounded-2xl border cursor-pointer transition-all flex flex-col gap-1.5 ${
                      newRole === "USER"
                        ? "bg-blue-500/10 border-blue-500/50 text-blue-400 ring-2 ring-blue-500/30"
                        : "bg-muted/40 border-border/60 text-muted-foreground hover:bg-muted"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 font-bold text-sm text-foreground">
                        <UserCheck className="w-4 h-4 text-blue-400" />
                        <span>Usuário Padrão</span>
                      </div>
                      <input
                        type="radio"
                        name="createRole"
                        value="USER"
                        checked={newRole === "USER"}
                        onChange={() => setNewRole("USER")}
                        className="w-4 h-4 text-blue-600"
                      />
                    </div>
                    <span className="text-[11px] text-muted-foreground leading-tight">
                      Acesso pessoal a tarefas, estudos, projetos, finanças e IA.
                    </span>
                  </label>

                  <label
                    className={`p-4 rounded-2xl border cursor-pointer transition-all flex flex-col gap-1.5 ${
                      newRole === "ADMIN"
                        ? "bg-purple-500/10 border-purple-500/50 text-purple-400 ring-2 ring-purple-500/30"
                        : "bg-muted/40 border-border/60 text-muted-foreground hover:bg-muted"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 font-bold text-sm text-foreground">
                        <ShieldCheck className="w-4 h-4 text-purple-400" />
                        <span>Administrador</span>
                      </div>
                      <input
                        type="radio"
                        name="createRole"
                        value="ADMIN"
                        checked={newRole === "ADMIN"}
                        onChange={() => setNewRole("ADMIN")}
                        className="w-4 h-4 text-purple-600"
                      />
                    </div>
                    <span className="text-[11px] text-muted-foreground leading-tight">
                      Acesso total + criação e gerenciamento de outros perfis.
                    </span>
                  </label>
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-border/40">
                <button
                  type="button"
                  onClick={() => setCreateModalOpen(false)}
                  className="px-5 py-2.5 rounded-xl text-sm font-bold text-muted-foreground hover:bg-muted"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-6 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-black text-sm shadow-md shadow-indigo-600/30 transition-all"
                >
                  {submitting ? "Cadastrando..." : "Cadastrar Usuário"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Editar Usuário / Redefinir Senha */}
      {editModalOpen && selectedUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs animate-fade-in">
          <div className="w-full max-w-lg rounded-3xl border border-border/80 bg-card p-6 sm:p-8 space-y-6 shadow-2xl">
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-2xl bg-indigo-500/15 text-indigo-400">
                <Edit2 className="w-6 h-6" />
              </div>
              <div>
                <h2 className="text-xl font-black text-foreground">Editar Usuário</h2>
                <p className="text-xs text-muted-foreground font-medium">
                  Altere privilégios ou redefina a senha de {selectedUser.name}
                </p>
              </div>
            </div>

            <form onSubmit={handleEdit} className="space-y-4">
              <div>
                <label className="block text-sm font-bold text-foreground mb-1.5">Nome Completo</label>
                <input
                  type="text"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl border border-border/70 bg-background text-foreground text-sm outline-none focus:ring-2 focus:ring-indigo-500/40 font-semibold"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-bold text-foreground mb-1.5">Usuário ou E-mail para Login</label>
                <input
                  type="text"
                  value={editEmail}
                  onChange={(e) => {
                    const sanitized = e.target.value.replace(/[^a-zA-Z0-9.@]/g, "");
                    setEditEmail(sanitized);
                  }}
                  className="w-full px-4 py-3 rounded-xl border border-border/70 bg-background text-foreground text-sm outline-none focus:ring-2 focus:ring-indigo-500/40 font-semibold"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-bold text-foreground mb-1.5">
                  Redefinir Senha <span className="text-xs font-normal text-muted-foreground">(Deixe em branco para manter a atual)</span>
                </label>
                <input
                  type="password"
                  value={editPassword}
                  onChange={(e) => setEditPassword(e.target.value)}
                  placeholder="Digite a nova senha se desejar alterar"
                  className="w-full px-4 py-3 rounded-xl border border-border/70 bg-background text-foreground text-sm outline-none focus:ring-2 focus:ring-indigo-500/40 font-semibold"
                />
              </div>

              {/* Privilege Selection */}
              <div className="space-y-2 pt-1">
                <label className="block text-sm font-bold text-foreground">Perfil de Privilégios</label>
                <div className="grid grid-cols-2 gap-3">
                  <label
                    className={`p-4 rounded-2xl border cursor-pointer transition-all flex flex-col gap-1.5 ${
                      editRole === "USER"
                        ? "bg-blue-500/10 border-blue-500/50 text-blue-400 ring-2 ring-blue-500/30"
                        : "bg-muted/40 border-border/60 text-muted-foreground hover:bg-muted"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 font-bold text-sm text-foreground">
                        <UserCheck className="w-4 h-4 text-blue-400" />
                        <span>Usuário Padrão</span>
                      </div>
                      <input
                        type="radio"
                        name="editRole"
                        value="USER"
                        checked={editRole === "USER"}
                        onChange={() => setEditRole("USER")}
                        disabled={selectedUser.id === currentUser?.id}
                        className="w-4 h-4 text-blue-600"
                      />
                    </div>
                    <span className="text-[11px] text-muted-foreground leading-tight">
                      Acesso padrão ao sistema.
                    </span>
                  </label>

                  <label
                    className={`p-4 rounded-2xl border cursor-pointer transition-all flex flex-col gap-1.5 ${
                      editRole === "ADMIN"
                        ? "bg-purple-500/10 border-purple-500/50 text-purple-400 ring-2 ring-purple-500/30"
                        : "bg-muted/40 border-border/60 text-muted-foreground hover:bg-muted"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 font-bold text-sm text-foreground">
                        <ShieldCheck className="w-4 h-4 text-purple-400" />
                        <span>Administrador</span>
                      </div>
                      <input
                        type="radio"
                        name="editRole"
                        value="ADMIN"
                        checked={editRole === "ADMIN"}
                        onChange={() => setEditRole("ADMIN")}
                        className="w-4 h-4 text-purple-600"
                      />
                    </div>
                    <span className="text-[11px] text-muted-foreground leading-tight">
                      Acesso total + gestão de perfis.
                    </span>
                  </label>
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-border/40">
                <button
                  type="button"
                  onClick={() => {
                    setEditModalOpen(false);
                    setSelectedUser(null);
                  }}
                  className="px-5 py-2.5 rounded-xl text-sm font-bold text-muted-foreground hover:bg-muted"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-6 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-black text-sm shadow-md shadow-indigo-600/30 transition-all"
                >
                  {submitting ? "Salvando..." : "Salvar Alterações"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

