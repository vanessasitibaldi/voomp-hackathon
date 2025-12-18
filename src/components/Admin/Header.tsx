import { DsAvatar, DsButtonIcon, DsSearchbar } from "@ds-cola/react";

export default function Header() {
  return (
    <header className="admin-header">
      <div className="logo">
        <img src="/logo_voomp.png" alt="Voomp Logo" />
      </div>
      <div className="searchbar">
        <DsSearchbar
          name="header-searchbar"
          dataTestId="header-searchbar"
          background="transparent"
          placeholder="Buscar..."
          aria-label="Campo de pesquisa"
        ></DsSearchbar>
      </div>
      <div className="progress">
        <img src="/progress.png" alt="Seu progresso" />
      </div>
      <div className="comands">
        <DsButtonIcon
          icon="settings"
          variant="ghost"
          color="neutral"
          dataTestId="button-icon-1"
        ></DsButtonIcon>
        <DsButtonIcon
          icon="help"
          variant="ghost"
          color="neutral"
          dataTestId="button-icon-2"
        ></DsButtonIcon>
        <DsAvatar
          size="large"
          variant="image"
          type="rounded"
          src="/avatar.png"
          dataTestId="header-avatar"
          name="Cogna da Silva"
        ></DsAvatar>
      </div>
    </header>
  );
}
