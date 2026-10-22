"use client";

import { ChevronDown, FilePlus2, FolderGit2, FolderOpen, Unlink } from "lucide-react";
import { Button, Menu, type MenuItem } from "@/components/ui";

export default function DraftsMenu({
  revising,
  onNewPost,
  onOpenFromGitHub,
  onStopRevising,
}: {
  revising: boolean;
  onNewPost: () => void;
  onOpenFromGitHub: () => void;
  onStopRevising: () => void;
}) {
  const items: MenuItem[] = [
    { id: "new", label: "New post", icon: FilePlus2, onSelect: onNewPost },
    { id: "open", label: "Open from GitHub…", icon: FolderGit2, onSelect: onOpenFromGitHub },
  ];
  if (revising) {
    items.push({ id: "stop", label: "Stop revising (keep text)", icon: Unlink, onSelect: onStopRevising });
  }

  return (
    <Menu
      items={items}
      trigger={(p) => (
        <Button {...p} size="sm" icon={FolderOpen} iconRight={ChevronDown} aria-label="Drafts">
          <span className="hidden sm:inline">Drafts</span>
        </Button>
      )}
    />
  );
}
