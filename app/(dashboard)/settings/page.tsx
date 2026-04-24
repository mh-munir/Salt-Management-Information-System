"use client";

import { ChangeEvent, FormEvent, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import ModalShell from "@/components/ModalShell";
import PlainImage from "@/components/PlainImage";
import {
  DEFAULT_BRAND_HEADING,
  DEFAULT_BRAND_SUBHEADING,
  loadStoredSidebarBranding,
  normalizeSidebarBranding,
  saveStoredSidebarBranding,
} from "@/lib/sidebar-branding";
import { translate } from "@/lib/language";
import { DEFAULT_FAVICON_URL, DEFAULT_SITE_TITLE } from "@/lib/site-settings";
import { useLanguage } from "@/lib/useLanguage";

type AdminUser = {
  _id: string;
  name?: string;
  email: string;
  role: "admin" | "superadmin";
  avatarUrl?: string;
  createdAt?: string;
  lastLoginAt?: string;
  isActive?: boolean;
};

type ProfileResponse = {
  name: string;
  email: string;
  role: "admin" | "superadmin";
  avatarUrl: string;
  faviconUrl: string;
  siteTitle: string;
  sidebarLogoUrl: string;
  sidebarHeading: string;
  sidebarSubheading: string;
};

const DEFAULT_AVATAR =
  "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='120' height='120' viewBox='0 0 120 120'%3E%3Crect width='120' height='120' rx='60' fill='%230ea5e9'/%3E%3Cpath d='M60 64c13.255 0 24-10.745 24-24S73.255 16 60 16 36 26.745 36 40s10.745 24 24 24zm0 8c-16.569 0-30 13.431-30 30v2h60v-2c0-16.569-13.431-30-30-30z' fill='white'/%3E%3C/svg%3E";
const MAX_IMAGE_UPLOAD_BYTES = 400 * 1024;
const FAVICON_FILE_ACCEPT = ".ico,image/png,image/jpeg,image/svg+xml,image/x-icon,image/vnd.microsoft.icon";

const syncDocumentSiteSettings = (nextFaviconUrl: string, nextSiteTitle: string) => {
  if (typeof document === "undefined") return;

  const resolvedTitle = nextSiteTitle.trim() || DEFAULT_SITE_TITLE;
  const resolvedFaviconUrl = nextFaviconUrl.trim() || DEFAULT_FAVICON_URL;

  document.title = resolvedTitle;

  const upsertLink = (rel: string) => {
    let link = document.head.querySelector(`link[data-live-site-icon="${rel}"]`) as HTMLLinkElement | null;

    if (!link) {
      link = document.createElement("link");
      link.setAttribute("data-live-site-icon", rel);
      link.rel = rel;
      document.head.appendChild(link);
    }

    link.href = resolvedFaviconUrl;
  };

  upsertLink("icon");
  upsertLink("shortcut icon");
  upsertLink("apple-touch-icon");
};

export default function SettingsPage() {
  const { language } = useLanguage();
  const router = useRouter();
  const [profile, setProfile] = useState<ProfileResponse | null>(null);
  const [avatarUrl, setAvatarUrl] = useState("");
  const [sidebarLogoUrl, setSidebarLogoUrl] = useState("");
  const [sidebarHeading, setSidebarHeading] = useState(DEFAULT_BRAND_HEADING);
  const [sidebarSubheading, setSidebarSubheading] = useState(DEFAULT_BRAND_SUBHEADING);
  const [faviconUrl, setFaviconUrl] = useState("");
  const [siteTitle, setSiteTitle] = useState("");
  const [admins, setAdmins] = useState<AdminUser[]>([]);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [pendingAdminPayload, setPendingAdminPayload] = useState<{
    name: string;
    email: string;
    password: string;
  } | null>(null);
  const [otpCode, setOtpCode] = useState("");
  const [devOtpHint, setDevOtpHint] = useState("");
  const [otpDestinationEmail, setOtpDestinationEmail] = useState("");
  const [passwordTarget, setPasswordTarget] = useState<AdminUser | null>(null);
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [editTarget, setEditTarget] = useState<AdminUser | null>(null);
  const [editName, setEditName] = useState("");
  const [editEmail, setEditEmail] = useState("");
  const [editAvatarUrl, setEditAvatarUrl] = useState("");
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [isUpdatingAdmin, setIsUpdatingAdmin] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [isSavingAvatar, setIsSavingAvatar] = useState(false);
  const [isSavingSidebarBranding, setIsSavingSidebarBranding] = useState(false);
  const [isSavingFavicon, setIsSavingFavicon] = useState(false);
  const [isSavingSiteSettings, setIsSavingSiteSettings] = useState(false);
  const [isCreatingAdmin, setIsCreatingAdmin] = useState(false);
  const [isVerifyingOtp, setIsVerifyingOtp] = useState(false);
  const [deletingAdminId, setDeletingAdminId] = useState<string | null>(null);
  const [showResetAllDataModal, setShowResetAllDataModal] = useState(false);
  const [isResettingAllData, setIsResettingAllData] = useState(false);
  const avatarInputRef = useRef<HTMLInputElement | null>(null);
  const isSuperAdmin = profile?.role === "superadmin";

  useEffect(() => {
    let isMounted = true;

    const applyStoredBranding = () => {
      if (!isMounted) return;
      const storedBranding = loadStoredSidebarBranding();
      setSidebarLogoUrl(storedBranding.sidebarLogoUrl);
      setSidebarHeading(storedBranding.sidebarHeading);
      setSidebarSubheading(storedBranding.sidebarSubheading);
    };

    const loadData = async () => {
      if (!isMounted) return;
      setError("");
      setMessage("");

      try {
        const profileRes = await fetch("/api/settings/profile", { cache: "no-store" });

        if (profileRes.status === 401) {
          router.push("/login");
          return;
        }

        if (!profileRes.ok) {
          if (isMounted) {
            setError("Could not load profile settings.");
          }
          return;
        }

        const profileData: ProfileResponse = await profileRes.json();
        if (!isMounted) return;

        const branding = normalizeSidebarBranding(profileData);
        setProfile(profileData);
        setAvatarUrl(profileData.avatarUrl ?? "");
        setFaviconUrl(profileData.faviconUrl ?? "");
        setSiteTitle(profileData.siteTitle ?? "");
        setSidebarLogoUrl(branding.sidebarLogoUrl);
        setSidebarHeading(branding.sidebarHeading);
        setSidebarSubheading(branding.sidebarSubheading);
        saveStoredSidebarBranding(branding);

        // Load admins separately so profile UI does not wait on admin list query latency.
        void (async () => {
          try {
            const adminsRes = await fetch("/api/admin-users", { cache: "no-store" });
            if (!isMounted) return;

            if (adminsRes.status === 401) {
              router.push("/login");
              return;
            }

            if (adminsRes.ok) {
              const adminData = await adminsRes.json().catch(() => null);
              if (Array.isArray(adminData) && isMounted) {
                setAdmins(adminData as AdminUser[]);
              }
              return;
            }

            const adminErrorPayload = await adminsRes.json().catch(() => null);
            const adminErrorMessage =
              typeof adminErrorPayload?.message === "string" && adminErrorPayload.message.trim()
                ? adminErrorPayload.message.trim()
                : "Admin list is temporarily unavailable.";

            if (isMounted) {
              setError((prev) => prev || adminErrorMessage);
            }
          } catch {
            if (isMounted) {
              setError((prev) => prev || "Admin list is temporarily unavailable.");
            }
          }
        })();
      } catch {
        if (isMounted) {
          setError("Could not load settings data. Please refresh and try again.");
        }
      }
    };

    const timeoutId = window.setTimeout(applyStoredBranding, 0);
    void loadData();

    return () => {
      isMounted = false;
      window.clearTimeout(timeoutId);
    };
  }, [router]);

  useEffect(() => {
    syncDocumentSiteSettings(faviconUrl, siteTitle);
  }, [faviconUrl, siteTitle]);

  const updateOwnAvatar = async (nextAvatarUrl: string) => {
    setIsSavingAvatar(true);
    setError("");
    setMessage("");

    const res = await fetch("/api/settings/profile", {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ avatarUrl: nextAvatarUrl.trim() }),
    });

    const data = await res.json().catch(() => ({}));

    if (res.status === 401) {
      router.push("/login");
      setIsSavingAvatar(false);
      return;
    }

    if (!res.ok) {
      setError(data?.message ?? "Failed to update image.");
      setIsSavingAvatar(false);
      return;
    }

    setProfile(data.user);
    setAvatarUrl(data.user.avatarUrl ?? "");
    saveStoredSidebarBranding(data.user);
    setMessage("Top navbar image updated.");
    window.dispatchEvent(new Event("profile-updated"));
    setIsSavingAvatar(false);
  };

  const updateFavicon = async (nextFaviconUrl: string, previousFaviconUrl: string) => {
    setIsSavingFavicon(true);
    setError("");
    setMessage("");

    const res = await fetch("/api/settings/profile", {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ faviconUrl: nextFaviconUrl.trim() }),
    });

    const data = await res.json().catch(() => ({}));

    if (res.status === 401) {
      setFaviconUrl(previousFaviconUrl);
      router.push("/login");
      setIsSavingFavicon(false);
      return;
    }

    if (!res.ok) {
      setFaviconUrl(previousFaviconUrl);
      setError(data?.message ?? "Failed to update favicon.");
      setIsSavingFavicon(false);
      return;
    }

    setProfile(data.user);
    setFaviconUrl(data.user.faviconUrl ?? "");
    setMessage("Favicon updated.");
    setIsSavingFavicon(false);
  };

  const onPickImage = (event: ChangeEvent<HTMLInputElement>) => {
    const input = event.currentTarget;
    const file = input.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      setError("Please choose a valid image file.");
      input.value = "";
      return;
    }
    if (file.size > MAX_IMAGE_UPLOAD_BYTES) {
      setError("Image is too large. Please upload an image smaller than 400KB.");
      input.value = "";
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      const result = typeof reader.result === "string" ? reader.result : "";
      if (!result) {
        setError("Could not read the selected image.");
        input.value = "";
        return;
      }
      setAvatarUrl(result);
      void updateOwnAvatar(result);
      input.value = "";
    };
    reader.readAsDataURL(file);
  };

  const onPickSidebarLogo = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      setError("Please choose a valid image file.");
      return;
    }
    if (file.size > MAX_IMAGE_UPLOAD_BYTES) {
      setError("Image is too large. Please upload an image smaller than 400KB.");
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      const result = typeof reader.result === "string" ? reader.result : "";
      if (!result) {
        setError("Could not read the selected image.");
        return;
      }
      setSidebarLogoUrl(result);
      setMessage("Sidebar logo selected. Click Save branding to apply.");
    };
    reader.readAsDataURL(file);
  };

  const onPickFavicon = (event: ChangeEvent<HTMLInputElement>) => {
    const input = event.currentTarget;
    const file = input.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/") && !file.name.toLowerCase().endsWith(".ico")) {
      setError("Please choose a valid favicon image.");
      input.value = "";
      return;
    }
    if (file.size > MAX_IMAGE_UPLOAD_BYTES) {
      setError("Favicon is too large. Please upload an image smaller than 400KB.");
      input.value = "";
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      const result = typeof reader.result === "string" ? reader.result : "";
      if (!result) {
        setError("Could not read the selected favicon.");
        input.value = "";
        return;
      }
      const previousFaviconUrl = faviconUrl;
      setFaviconUrl(result);
      void updateFavicon(result, previousFaviconUrl);
      input.value = "";
    };
    reader.readAsDataURL(file);
  };

  const onPickEditAvatar = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      setError("Please choose a valid image file.");
      return;
    }
    if (file.size > MAX_IMAGE_UPLOAD_BYTES) {
      setError("Image is too large. Please upload an image smaller than 400KB.");
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      const result = typeof reader.result === "string" ? reader.result : "";
      if (!result) {
        setError("Could not read the selected image.");
        return;
      }
      setEditAvatarUrl(result);
      setMessage("Admin image selected. Click Update admin to save.");
    };
    reader.readAsDataURL(file);
  };

  const createAdmin = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!isSuperAdmin) {
      setError("Only super admin can create admin accounts.");
      return;
    }

    setIsCreatingAdmin(true);
    setError("");
    setMessage("");
    setDevOtpHint("");

    const payload = {
      name: name.trim(),
      email: email.trim().toLowerCase(),
      password,
    };

    const res = await fetch("/api/admin-users/otp/request", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    const data = await res.json().catch(() => ({}));

    if (res.status === 401) {
      router.push("/login");
      setIsCreatingAdmin(false);
      return;
    }

    if (!res.ok) {
      setError(data?.message ?? "Failed to send OTP.");
      setIsCreatingAdmin(false);
      return;
    }

    setPendingAdminPayload(payload);
    setOtpCode("");
    setOtpDestinationEmail(
      typeof data?.otpSentTo === "string" && data.otpSentTo.trim()
        ? data.otpSentTo
        : profile?.email ?? ""
    );
    if (data?.devOtp) {
      setDevOtpHint(String(data.devOtp));
    }
    setMessage("OTP sent to super admin email. Verify OTP to create the account.");
    setIsCreatingAdmin(false);
  };

  const verifyAdminOtp = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!pendingAdminPayload) return;

    setIsVerifyingOtp(true);
    setError("");
    setMessage("");

    const res = await fetch("/api/admin-users/otp/verify", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        email: pendingAdminPayload.email,
        otp: otpCode.trim(),
      }),
    });

    const data = await res.json().catch(() => ({}));

    if (res.status === 401) {
      router.push("/login");
      setIsVerifyingOtp(false);
      return;
    }

    if (!res.ok) {
      setError(data?.message ?? "OTP verification failed.");
      setIsVerifyingOtp(false);
      return;
    }

    setAdmins((prev) => [data.user, ...prev]);
    setName("");
    setEmail("");
    setPassword("");
    setPendingAdminPayload(null);
    setOtpCode("");
    setDevOtpHint("");
    setOtpDestinationEmail("");
    setMessage("New admin user created.");
    setIsVerifyingOtp(false);
  };

  const resendAdminOtp = async () => {
    if (!pendingAdminPayload) return;

    setIsCreatingAdmin(true);
    setError("");
    setMessage("");
    setDevOtpHint("");

    const res = await fetch("/api/admin-users/otp/request", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(pendingAdminPayload),
    });

    const data = await res.json().catch(() => ({}));

    if (res.status === 401) {
      router.push("/login");
      setIsCreatingAdmin(false);
      return;
    }

    if (!res.ok) {
      setError(data?.message ?? "Failed to resend OTP.");
      setIsCreatingAdmin(false);
      return;
    }

    if (data?.devOtp) {
      setDevOtpHint(String(data.devOtp));
    }
    setOtpDestinationEmail(
      typeof data?.otpSentTo === "string" && data.otpSentTo.trim()
        ? data.otpSentTo
        : profile?.email ?? ""
    );
    setMessage("A new OTP was sent to super admin email.");
    setIsCreatingAdmin(false);
  };

  const cancelAdminOtpFlow = () => {
    setPendingAdminPayload(null);
    setOtpCode("");
    setDevOtpHint("");
    setOtpDestinationEmail("");
    setError("");
    setMessage("");
  };

  const saveSidebarBranding = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsSavingSidebarBranding(true);
    setError("");
    setMessage("");

    const res = await fetch("/api/settings/profile", {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        sidebarLogoUrl: sidebarLogoUrl.trim(),
        sidebarHeading: sidebarHeading.trim(),
        sidebarSubheading: sidebarSubheading.trim(),
      }),
    });

    const data = await res.json().catch(() => ({}));

    if (res.status === 401) {
      router.push("/login");
      setIsSavingSidebarBranding(false);
      return;
    }

    if (!res.ok) {
      setError(data?.message ?? "Failed to update sidebar branding.");
      setIsSavingSidebarBranding(false);
      return;
    }

    setProfile(data.user);
    const branding = normalizeSidebarBranding(data.user);
    setSidebarLogoUrl(branding.sidebarLogoUrl);
    setSidebarHeading(branding.sidebarHeading);
    setSidebarSubheading(branding.sidebarSubheading);
    saveStoredSidebarBranding(branding);
    setMessage("Sidebar branding updated.");
    window.dispatchEvent(
      new CustomEvent("sidebar-branding-updated", {
        detail: branding,
      })
    );
    window.dispatchEvent(new Event("profile-updated"));
    setIsSavingSidebarBranding(false);
  };

  const saveSiteSettings = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsSavingSiteSettings(true);
    setError("");
    setMessage("");

    const res = await fetch("/api/settings/profile", {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        faviconUrl: faviconUrl.trim(),
        siteTitle: siteTitle.trim(),
      }),
    });

    const data = await res.json().catch(() => ({}));

    if (res.status === 401) {
      router.push("/login");
      setIsSavingSiteSettings(false);
      return;
    }

    if (!res.ok) {
      setError(data?.message ?? "Failed to update site settings.");
      setIsSavingSiteSettings(false);
      return;
    }

    setProfile(data.user);
    setFaviconUrl(data.user.faviconUrl ?? "");
    setSiteTitle(data.user.siteTitle ?? "");
    setMessage("Favicon and site title updated.");
    setIsSavingSiteSettings(false);
  };

  const openPasswordDialog = (admin: AdminUser) => {
    setPasswordTarget(admin);
    setNewPassword("");
    setConfirmPassword("");
    setError("");
    setMessage("");
  };

  const closePasswordDialog = () => {
    setPasswordTarget(null);
    setNewPassword("");
    setConfirmPassword("");
  };

  const openEditDialog = (admin: AdminUser) => {
    setEditTarget(admin);
    setEditName(admin.name ?? "");
    setEditEmail(admin.email ?? "");
    setEditAvatarUrl(admin.avatarUrl ?? "");
    setError("");
    setMessage("");
  };

  const closeEditDialog = () => {
    setEditTarget(null);
    setEditName("");
    setEditEmail("");
    setEditAvatarUrl("");
  };

  const changeAdminPassword = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!passwordTarget) return;

    setError("");
    setMessage("");

    if (newPassword.length < 8) {
      setError("New password must be at least 8 characters.");
      return;
    }

    if (newPassword !== confirmPassword) {
      setError("New password and confirm password do not match.");
      return;
    }

    setIsChangingPassword(true);

    const res = await fetch(`/api/admin-users/${passwordTarget._id}/password`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ newPassword }),
    });

    const data = await res.json().catch(() => ({}));

    if (res.status === 401) {
      router.push("/login");
      setIsChangingPassword(false);
      return;
    }

    if (!res.ok) {
      setError(data?.message ?? "Failed to change password.");
      setIsChangingPassword(false);
      return;
    }

    setMessage(`${passwordTarget.name || passwordTarget.email} password updated.`);
    setIsChangingPassword(false);
    closePasswordDialog();
  };

  const deleteAdmin = async (admin: AdminUser) => {
    if (!isSuperAdmin) {
      setError("Only super admin can delete admin accounts.");
      return;
    }

    if (admin.role === "superadmin") {
      setError("Super admin account cannot be deleted.");
      return;
    }

    const shouldDelete = window.confirm(
      `Are you sure you want to delete ${admin.name || admin.email}? This action cannot be undone.`
    );
    if (!shouldDelete) return;

    setDeletingAdminId(admin._id);
    setError("");
    setMessage("");

    const res = await fetch(`/api/admin-users/${admin._id}`, {
      method: "DELETE",
    });

    const data = await res.json().catch(() => ({}));

    if (res.status === 401) {
      router.push("/login");
      setDeletingAdminId(null);
      return;
    }

    if (!res.ok) {
      setError(data?.message ?? "Failed to delete admin user.");
      setDeletingAdminId(null);
      return;
    }

    setAdmins((prev) => prev.filter((item) => item._id !== admin._id));
    setMessage(`${admin.name || admin.email} deleted successfully.`);
    setDeletingAdminId(null);
  };

  const closeResetAllDataModal = () => {
    if (isResettingAllData) return;
    setShowResetAllDataModal(false);
  };

  const resetAllData = async () => {
    if (!isSuperAdmin) {
      setError("Only super admin can reset all data.");
      setShowResetAllDataModal(false);
      return;
    }

    setIsResettingAllData(true);
    setError("");
    setMessage("");

    try {
      const res = await fetch("/api/admin-users/reset-all-data", {
        method: "POST",
      });

      const data = await res.json().catch(() => ({}));

      if (res.status === 401) {
        router.push("/login");
        setIsResettingAllData(false);
        return;
      }

      if (!res.ok) {
        setError(data?.message ?? "Failed to reset all data.");
        setIsResettingAllData(false);
        return;
      }

      setShowResetAllDataModal(false);
      window.location.assign("/dashboard");
    } catch {
      setError("Failed to reset all data.");
      setIsResettingAllData(false);
    }
  };

  const updateAdminProfile = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!editTarget) return;

    setError("");
    setMessage("");

    if (!editName.trim() || !editEmail.trim()) {
      setError("Name and email are required.");
      return;
    }

    setIsUpdatingAdmin(true);
    const wasOwnAccount =
      profile?.email?.trim().toLowerCase() === editTarget.email.trim().toLowerCase();

    const res = await fetch(`/api/admin-users/${editTarget._id}`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        name: editName.trim(),
        email: editEmail.trim(),
        avatarUrl: editAvatarUrl.trim(),
      }),
    });

    const data = await res.json().catch(() => ({}));

    if (res.status === 401) {
      router.push("/login");
      setIsUpdatingAdmin(false);
      return;
    }

    if (!res.ok) {
      setError(data?.message ?? "Failed to update admin profile.");
      setIsUpdatingAdmin(false);
      return;
    }

    setAdmins((prev) =>
      prev.map((item) => (item._id === editTarget._id ? { ...item, ...data.user } : item))
    );

    if (wasOwnAccount && profile) {
      setProfile({
        ...profile,
        name: data.user.name ?? profile.name,
        email: data.user.email ?? profile.email,
        avatarUrl: data.user.avatarUrl ?? profile.avatarUrl,
      });
      setAvatarUrl(data.user.avatarUrl ?? profile.avatarUrl);
      window.dispatchEvent(new Event("profile-updated"));
    }

    setMessage(`${data.user?.name || data.user?.email || "Admin"} updated successfully.`);
    setIsUpdatingAdmin(false);
    closeEditDialog();
  };

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-semibold text-slate-900">Settings</h1>
        <p className="mt-1 text-sm text-slate-600">
          Manage admin accounts, top navbar image, and sidebar branding.
        </p>
      </div>

      {error ? (
        <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</div>
      ) : null}
      {message ? (
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
          {message}
        </div>
      ) : null}

      <div className="grid gap-4 2xl:grid-cols-[1.2fr_1fr]">
        <section className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-slate-900">Top Navbar Image</h2>
          <p className="mt-1 text-sm text-slate-600">
            You can paste an image URL or upload a local image.
          </p>

          <div className="mt-5 flex flex-col gap-4 sm:flex-row sm:items-center">
            <PlainImage
              src={avatarUrl || profile?.avatarUrl || DEFAULT_AVATAR}
              alt="Navbar avatar preview"
              className="h-16 w-16 rounded-full border border-slate-200 object-cover"
            />
            <div>
              <p className="text-sm font-medium text-slate-800">{profile?.email ?? "Loading..."}</p>
              <p className="text-xs uppercase tracking-wide text-slate-500">{profile?.role ?? "admin"}</p>
            </div>
          </div>

          <div className="mt-6 rounded-lg border border-slate-200 bg-slate-50 p-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
              <button
                type="button"
                onClick={() => avatarInputRef.current?.click()}
                disabled={isSavingAvatar}
                className="group relative h-20 w-20 overflow-hidden rounded-full border border-slate-200 bg-white shadow-sm transition hover:border-sky-400 disabled:cursor-not-allowed disabled:opacity-70"
                title="Click to change your profile image"
              >
                <PlainImage
                  src={avatarUrl || profile?.avatarUrl || DEFAULT_AVATAR}
                  alt="Click to change profile image"
                  className="h-full w-full object-cover"
                />
                <span className="absolute inset-0 flex items-center justify-center bg-black/45 text-xs font-semibold text-white opacity-0 transition group-hover:opacity-100">
                  Change
                </span>
              </button>
              <div className="text-sm text-slate-600">
                Click your image to change admin profile photo.
                {isSavingAvatar ? " Updating..." : ""}
              </div>
            </div>
            <input
              ref={avatarInputRef}
              id="avatar-upload"
              name="avatarUpload"
              type="file"
              accept="image/*"
              onChange={onPickImage}
              className="hidden"
            />
          </div>

          <div className="my-8 border-t border-slate-100" />

          <h2 className="text-lg font-semibold text-slate-900">Sidebar Branding</h2>
          <p className="mt-1 text-sm text-slate-600">
            Update the sidebar logo and heading text shown above the menu.
          </p>

          <div className="mt-5 rounded-lg border border-slate-200 bg-slate-50 p-4">
            <div className="space-y-2">
              <div className="flex items-center gap-3">
                {sidebarLogoUrl ? (
                  <PlainImage
                    src={sidebarLogoUrl}
                    alt="Sidebar logo preview"
                    className="h-10 w-14 rounded-lg border border-slate-200 bg-white p-1 object-contain"
                  />
                ) : (
                  <div className="h-10 w-14 rounded-lg border border-dashed border-slate-300 bg-white" />
                )}
                <div className="min-w-0">
                  <p className="text-base font-semibold leading-tight tracking-[-0.02em] text-slate-900">
                    {sidebarHeading.trim() || DEFAULT_BRAND_HEADING}
                  </p>
                </div>
              </div>
              <p className="text-xs uppercase tracking-[0.22em] text-slate-500">
                {sidebarSubheading.trim() || DEFAULT_BRAND_SUBHEADING}
              </p>
            </div>
          </div>

          <form className="mt-6 space-y-4" onSubmit={saveSidebarBranding}>
            <div>
              <label htmlFor="sidebar-logo-upload" className="mb-1 block text-sm font-medium text-slate-700">Upload logo from device</label>
              <input
                id="sidebar-logo-upload"
                name="sidebarLogoUpload"
                type="file"
                accept="image/*"
                onChange={onPickSidebarLogo}
                className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700"
              />
            </div>

            <div>
              <label htmlFor="sidebar-heading" className="mb-1 block text-sm font-medium text-slate-700">Sidebar Heading</label>
              <input
                id="sidebar-heading"
                name="sidebarHeading"
                value={sidebarHeading}
                onChange={(event) => setSidebarHeading(event.target.value)}
                placeholder={DEFAULT_BRAND_HEADING}
                maxLength={40}
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-sky-500"
              />
            </div>

            <div>
              <label htmlFor="sidebar-subheading" className="mb-1 block text-sm font-medium text-slate-700">Sidebar Subheading</label>
              <input
                id="sidebar-subheading"
                name="sidebarSubheading"
                value={sidebarSubheading}
                onChange={(event) => setSidebarSubheading(event.target.value)}
                placeholder={DEFAULT_BRAND_SUBHEADING}
                maxLength={80}
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-sky-500"
              />
            </div>

            <button
              type="submit"
              disabled={isSavingSidebarBranding}
              className="rounded-lg bg-[#348CD4] px-4 py-2 text-sm font-medium text-white disabled:cursor-not-allowed disabled:opacity-70 hover:bg-[#2F7FC0]"
            >
              {isSavingSidebarBranding ? "Saving..." : "Save branding"}
            </button>
          </form>

          <div className="my-8 border-t border-slate-100" />

          <form className="space-y-4" onSubmit={saveSiteSettings}>
            <div>
              <h2 className="text-lg font-semibold text-slate-900">Favicon</h2>
              <div className="mt-3 rounded-lg border border-slate-200 bg-slate-50 p-4">
                <div className="flex items-center gap-4">
                  {faviconUrl ? (
                    <div className="flex h-14 w-14 items-center justify-center rounded-xl border border-slate-200 bg-white shadow-sm">
                      <PlainImage
                        src={faviconUrl}
                        alt="Favicon preview"
                        className="h-8 w-8 object-contain"
                      />
                    </div>
                  ) : (
                    <div className="flex h-14 w-14 items-center justify-center rounded-xl border border-dashed border-slate-300 bg-white text-xs font-medium text-slate-400">
                      Icon
                    </div>
                  )}
                  <div className="min-w-0 text-sm text-slate-600">
                    <p className="font-medium text-slate-800">{siteTitle.trim() || DEFAULT_SITE_TITLE}</p>
                    <p>{isSavingFavicon ? "Uploading and applying favicon..." : "Upload a favicon and it will update right away."}</p>
                  </div>
                </div>
              </div>
              <label htmlFor="favicon-upload" className="mt-4 mb-1 block text-sm font-medium text-slate-700">Upload favicon from device</label>
              <input
                id="favicon-upload"
                name="faviconUpload"
                type="file"
                accept={FAVICON_FILE_ACCEPT}
                onChange={onPickFavicon}
                className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700"
              />
              <p className="mt-1 text-xs text-slate-500">
                Supported: ICO, PNG, JPG, SVG. Max size 400KB.
              </p>
            </div>

            <div>
              <h2 className="text-lg font-semibold text-slate-900">Site title Change</h2>
              <label htmlFor="site-title" className="mt-2 mb-1 block text-sm font-medium text-slate-700">Site Title</label>
              <input
                id="site-title"
                name="siteTitle"
                value={siteTitle}
                onChange={(event) => setSiteTitle(event.target.value)}
                placeholder={DEFAULT_SITE_TITLE}
                maxLength={80}
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-sky-500"
              />
            </div>

            <button
              type="submit"
              disabled={isSavingSiteSettings || isSavingFavicon}
              className="rounded-lg bg-[#348CD4] px-4 py-2 text-sm font-medium text-white disabled:cursor-not-allowed disabled:opacity-70 hover:bg-[#2F7FC0]"
            >
              {isSavingSiteSettings ? "Saving..." : isSavingFavicon ? "Updating favicon..." : "Save site settings"}
            </button>
          </form>
        </section>

        <section className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-slate-900">Create Admin User</h2>
          <p className="mt-1 text-sm text-slate-600">
            Super admin can create admin accounts with email OTP verification.
          </p>
          {!isSuperAdmin ? (
            <p className="mt-2 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-700">
              Only super admin can create new admin accounts.
            </p>
          ) : null}

          <form className="mt-5 space-y-4" onSubmit={createAdmin}>
            <div>
              <label htmlFor="admin-name" className="mb-1 block text-sm font-medium text-slate-700">Name (optional)</label>
              <input
                id="admin-name"
                name="adminName"
                value={name}
                onChange={(event) => setName(event.target.value)}
                placeholder="Admin name"
                disabled={!isSuperAdmin || Boolean(pendingAdminPayload)}
                className="w-full rounded-md border border-slate-200 px-3 py-2 text-sm outline-none focus:border-sky-500"
              />
            </div>

            <div>
              <label htmlFor="admin-email" className="mb-1 block text-sm font-medium text-slate-700">Email</label>
              <input
                id="admin-email"
                name="adminEmail"
                type="email"
                required
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="newadmin@gmail.com"
                disabled={!isSuperAdmin || Boolean(pendingAdminPayload)}
                className="w-full rounded-md border border-slate-200 px-3 py-2 text-sm outline-none focus:border-sky-500"
              />
            </div>

            <div>
              <label htmlFor="admin-password" className="mb-1 block text-sm font-medium text-slate-700">Password</label>
              <input
                id="admin-password"
                name="adminPassword"
                type="password"
                required
                minLength={8}
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                placeholder="At least 8 characters"
                disabled={!isSuperAdmin || Boolean(pendingAdminPayload)}
                className="w-full rounded-md border border-slate-200 px-3 py-2 text-sm outline-none focus:border-sky-500"
              />
            </div>

            <button
              type="submit"
              disabled={isCreatingAdmin || !isSuperAdmin || Boolean(pendingAdminPayload)}
              className="rounded-md bg-[#348CD4] px-4 py-2 text-sm font-medium text-white disabled:cursor-not-allowed disabled:opacity-70 hover:bg-[#2F7FC0]"
            >
              {isCreatingAdmin ? "Sending OTP..." : "Send OTP"}
            </button>
          </form>

          {pendingAdminPayload ? (
            <form className="mt-4 space-y-3 rounded-2xl border border-sky-200 bg-sky-50 p-4" onSubmit={verifyAdminOtp}>
              <p className="text-sm font-medium text-sky-800">
                OTP sent to super admin email{" "}
                <span className="font-semibold">{otpDestinationEmail || profile?.email || "-"}</span>
              </p>
              <p className="text-xs text-sky-700">
                Enter that OTP to approve admin creation for{" "}
                <span className="font-semibold">{pendingAdminPayload.email}</span>.
              </p>
              {devOtpHint ? (
                <p className="text-xs text-sky-700">
                  Dev OTP: <span className="font-semibold">{devOtpHint}</span>
                </p>
              ) : null}

              <div>
                <label htmlFor="admin-otp-code" className="mb-1 block text-sm font-medium text-slate-700">Enter OTP</label>
                <input
                  id="admin-otp-code"
                  name="otpCode"
                  value={otpCode}
                  onChange={(event) => setOtpCode(event.target.value)}
                  placeholder="6-digit OTP"
                  maxLength={6}
                  required
                  className="w-full rounded-md border border-slate-200 px-3 py-2 text-sm outline-none focus:border-sky-500"
                />
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="submit"
                  disabled={isVerifyingOtp}
                  className="rounded-md bg-[#348CD4] px-4 py-2 text-sm font-medium text-white disabled:cursor-not-allowed disabled:opacity-70 hover:bg-[#2F7FC0]"
                >
                  {isVerifyingOtp ? "Verifying..." : "Verify OTP & Create"}
                </button>
                <button
                  type="button"
                  onClick={resendAdminOtp}
                  disabled={isCreatingAdmin}
                  className="rounded-md border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-white disabled:cursor-not-allowed disabled:opacity-70"
                >
                  {isCreatingAdmin ? "Sending..." : "Resend OTP"}
                </button>
                <button
                  type="button"
                  onClick={cancelAdminOtpFlow}
                  className="rounded-md border border-rose-200 px-4 py-2 text-sm font-medium text-rose-700 hover:bg-rose-50"
                >
                  Cancel
                </button>
              </div>
            </form>
          ) : null}
        </section>
      </div>

      <section className="admin-users-section rounded-md border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="text-lg font-semibold text-slate-900">Admin Users</h2>
        <p className="mt-1 text-sm text-slate-600">
          Only super admin can change passwords for admin accounts.
        </p>
        <div className="admin-users-list mt-4 divide-y divide-slate-100">
          {admins.length ? (
            admins.map((admin) => {
              const isOwnAccount =
                profile?.email?.trim().toLowerCase() === admin.email.trim().toLowerCase();
              const canChangeThisPassword = isSuperAdmin;
              const canEditThisAdmin = isSuperAdmin || isOwnAccount;

              return (
                <div key={admin._id} className="admin-user-row flex flex-col gap-3 py-3 sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex items-center gap-3">
                    <div className="relative">
                      <PlainImage
                        src={admin.avatarUrl || DEFAULT_AVATAR}
                        alt={`${admin.name || admin.email} avatar`}
                        className="h-11 w-11 rounded-full border border-slate-200 object-cover"
                      />
                      <span
                        className={`absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full border-2 border-white ${
                          admin.isActive ? "bg-emerald-500" : "bg-slate-400"
                        }`}
                        aria-label={admin.isActive ? "Active admin" : "Inactive admin"}
                        title={admin.isActive ? "Active admin" : "Inactive admin"}
                      />
                    </div>
                    <div>
                      <p className="font-medium text-slate-900">{admin.name || "Unnamed Admin"}</p>
                      <p className="text-sm text-slate-600">{admin.email}</p>
                      <p className={`text-xs font-medium ${admin.isActive ? "text-emerald-600" : "text-slate-500"}`}>
                        {admin.isActive ? "Active" : "Inactive"}
                      </p>
                    </div>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="admin-user-badge rounded-full border border-slate-200 px-3 py-1 text-xs uppercase tracking-wide text-slate-600">
                      {admin.role}
                    </span>
                    <button
                      type="button"
                      onClick={() => openEditDialog(admin)}
                      disabled={!canEditThisAdmin}
                      className="admin-user-action rounded-md border border-sky-200 px-3 py-1 text-xs font-semibold text-sky-700 hover:bg-sky-50 disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:bg-transparent"
                      title={canEditThisAdmin ? translate(language, "editAdmin") : translate(language, "onlySuperAdminEdit")}
                    >
                      Edit
                    </button>
                    <button
                      type="button"
                      onClick={() => openPasswordDialog(admin)}
                      disabled={!canChangeThisPassword}
                      className="admin-user-action rounded-md border border-slate-200 px-3 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:bg-transparent"
                      title={canChangeThisPassword ? translate(language, "changePassword") : translate(language, "onlySuperAdminPassword")}
                    >
                      Change password
                    </button>
                    {isSuperAdmin && admin.role !== "superadmin" ? (
                      <button
                        type="button"
                        onClick={() => deleteAdmin(admin)}
                        disabled={deletingAdminId === admin._id}
                        className="admin-user-action rounded-md border border-rose-200 px-3 py-1 text-xs font-semibold text-rose-600 hover:bg-rose-50 disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        {deletingAdminId === admin._id ? "Deleting..." : "Delete"}
                      </button>
                    ) : null}
                  </div>
                </div>
              );
            })
          ) : (
            <p className="py-3 text-sm text-slate-500">No admin users found yet.</p>
          )}
        </div>
      </section>

      {isSuperAdmin ? (
        <section className="rounded-md border border-rose-200 bg-rose-50 p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-rose-700">Reset All Data</h2>
          <p className="mt-1 text-sm text-rose-600">
            Remove all sales, transactions, customers, suppliers, costs, and products from the system.
          </p>
          <button
            type="button"
            onClick={() => setShowResetAllDataModal(true)}
            className="mt-4 rounded-md bg-rose-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-rose-700"
          >
            Reset All Data
          </button>
        </section>
      ) : null}

      {editTarget ? (
        <ModalShell
          title={translate(language, "editAdminProfile")}
          description="Refresh account identity, avatar, and contact details from one place."
          tone="sky"
          widthClassName="max-w-2xl"
          onClose={closeEditDialog}
        >
          <form className="space-y-5" onSubmit={updateAdminProfile}>
            <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
                <PlainImage
                  src={editAvatarUrl || DEFAULT_AVATAR}
                  alt="Admin avatar preview"
                  className="h-20 w-20 rounded-3xl border border-white object-cover shadow-sm"
                />
                <div className="flex-1">
                  <label htmlFor="edit-admin-avatar-url" className="mb-1.5 block text-sm font-medium text-slate-700">Avatar URL</label>
                  <input
                    id="edit-admin-avatar-url"
                    name="editAvatarUrl"
                    value={editAvatarUrl}
                    onChange={(event) => setEditAvatarUrl(event.target.value)}
                    placeholder="https://example.com/avatar.png"
                    className="w-full rounded-lg border border-slate-200 bg-white px-4 py-3 text-sm outline-none transition focus:border-sky-400 focus:bg-white"
                  />
                </div>
              </div>

              <div className="mt-4">
                <label htmlFor="edit-admin-avatar-upload" className="mb-1.5 block text-sm font-medium text-slate-700">Or upload image</label>
                <input
                  id="edit-admin-avatar-upload"
                  name="editAvatarUpload"
                  type="file"
                  accept="image/*"
                  onChange={onPickEditAvatar}
                  className="w-full rounded-lg border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700"
                />
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label htmlFor="edit-admin-name" className="mb-1.5 block text-sm font-medium text-slate-700">Name</label>
                <input
                  id="edit-admin-name"
                  name="editAdminName"
                  value={editName}
                  onChange={(event) => setEditName(event.target.value)}
                  placeholder="Admin name"
                  required
                  className="w-full rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none transition focus:border-sky-400 focus:bg-white"
                />
              </div>

              <div>
                <label htmlFor="edit-admin-email" className="mb-1.5 block text-sm font-medium text-slate-700">Email</label>
                <input
                  id="edit-admin-email"
                  name="editAdminEmail"
                  type="email"
                  value={editEmail}
                  onChange={(event) => setEditEmail(event.target.value)}
                  placeholder="admin@example.com"
                  required
                  className="w-full rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none transition focus:border-sky-400 focus:bg-white"
                />
              </div>
            </div>

            <div className="flex flex-wrap items-center justify-end gap-3 pt-1">
              <button
                type="button"
                onClick={closeEditDialog}
                className="rounded-lg border border-slate-200 bg-white px-5 py-2.5 text-sm font-semibold text-slate-700 transition hover:border-slate-300 hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isUpdatingAdmin}
                className="rounded-lg bg-[#348CD4] px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-[#2F7FC0] disabled:cursor-not-allowed disabled:opacity-70"
              >
                {isUpdatingAdmin ? "Updating..." : "Update admin"}
              </button>
            </div>
          </form>
        </ModalShell>
      ) : null}

      {passwordTarget ? (
        <ModalShell
          title={translate(language, "changeAdminPassword")}
          description={`${passwordTarget.name || "Admin"} (${passwordTarget.email})`}
          tone="sky"
          widthClassName="max-w-lg"
          onClose={closePasswordDialog}
        >
          <form className="space-y-4" onSubmit={changeAdminPassword}>
            <div className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600">
              Set a new password for this account. Use at least 8 characters for a stronger login credential.
            </div>

            <div>
              <label htmlFor="admin-new-password" className="mb-1.5 block text-sm font-medium text-slate-700">New password</label>
              <input
                id="admin-new-password"
                name="newPassword"
                type="password"
                minLength={8}
                value={newPassword}
                onChange={(event) => setNewPassword(event.target.value)}
                placeholder="At least 8 characters"
                required
                className="w-full rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none transition focus:border-sky-400 focus:bg-white"
              />
            </div>

            <div>
              <label htmlFor="admin-confirm-password" className="mb-1.5 block text-sm font-medium text-slate-700">Confirm password</label>
              <input
                id="admin-confirm-password"
                name="confirmPassword"
                type="password"
                minLength={8}
                value={confirmPassword}
                onChange={(event) => setConfirmPassword(event.target.value)}
                placeholder="Retype new password"
                required
                className="w-full rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none transition focus:border-sky-400 focus:bg-white"
              />
            </div>

            <div className="flex flex-wrap items-center justify-end gap-3 pt-1">
              <button
                type="button"
                onClick={closePasswordDialog}
                className="rounded-lg border border-slate-200 bg-white px-5 py-2.5 text-sm font-semibold text-slate-700 transition hover:border-slate-300 hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isChangingPassword}
                className="rounded-lg bg-[#348CD4] px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-[#2F7FC0] disabled:cursor-not-allowed disabled:opacity-70"
              >
                {isChangingPassword ? "Updating..." : "Update password"}
              </button>
            </div>
          </form>
        </ModalShell>
      ) : null}

      {showResetAllDataModal ? (
        <ModalShell
          title="Reset All Data"
          description="Sure, You want to delete all data"
          tone="rose"
          widthClassName="max-w-md"
          onClose={closeResetAllDataModal}
        >
          <div className="space-y-4">
            <div className="rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
              Sure, You want to delete all data
            </div>

            <div className="flex flex-wrap items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={closeResetAllDataModal}
                disabled={isResettingAllData}
                className="rounded-lg border border-slate-200 bg-white px-5 py-2.5 text-sm font-semibold text-slate-700 transition hover:border-slate-300 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-70"
              >
                No
              </button>
              <button
                type="button"
                onClick={resetAllData}
                disabled={isResettingAllData}
                className="rounded-lg bg-rose-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-rose-700 disabled:cursor-not-allowed disabled:opacity-70"
              >
                {isResettingAllData ? "Deleting..." : "Yes"}
              </button>
            </div>
          </div>
        </ModalShell>
      ) : null}
    </div>
  );
}
