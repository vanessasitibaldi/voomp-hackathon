import { DsButton, DsMenuItem, DsTypography } from "@ds-cola/react";
import Header from "./Header";

export default function Analytics() {
  const contentData = {
    header: {
      title: "Analytics",
      subtitle: "Veja os dados de conversão e tenha insights para novas vendas",
      buttonHeader: false,
      buttonTitle: "Recomendações",
      buttonIcon: "auto_awesome",
    },
    iframe: {
      src: "https://lookerstudio.google.com/reporting/4e39865d-2b68-4517-bfb0-f59ad6d25452",
    },
  };
  const navbarItems = [
    {
      value: "Página Inicial",
      variant: "icon" as const,
      icon: "home",
    },
    {
      value: "Produtos",
      variant: "cascade" as const,
      icon: "content_copy",
    },
    {
      value: "Vendas",
      variant: "cascade" as const,
      icon: "timeline",
    },
    {
      value: "Financeiro",
      variant: "cascade" as const,
      icon: "monetization_on",
    },
    {
      value: "Checkout",
      variant: "cascade" as const,
      icon: "view_comfy",
    },
    {
      value: "Analytics",
      variant: "icon" as const,
      icon: "analytics",
    },
    {
      value: "Relatórios",
      variant: "icon" as const,
      icon: "pie_chart",
    },
    {
      value: "Voomp Play",
      variant: "icon" as const,
      icon: "play_arrow",
    },
    {
      value: "Ferramentas",
      variant: "cascade" as const,
      icon: "link",
    },
    {
      value: "Parcerias",
      variant: "icon" as const,
      icon: "people",
    },
  ];

  return (
    <div className="admin-container">
      <Header />
      <div className="admin-content-wrapper">
        <div className="admin-navbar">
          {navbarItems.map((item, index) => (
            <DsMenuItem
              key={index}
              value={item.value}
              variant={item.variant}
              icon={item.icon}
              active={item.value === "Analytics"}
            />
          ))}
        </div>
        <div className="admin-content">
          <div className="admin-content-header">
            <div className="titles">
              <DsTypography variant="title-large">
                {contentData.header.title}
              </DsTypography>
              <DsTypography variant="title-small">
                {contentData.header.subtitle}
              </DsTypography>
            </div>
            <div className="right-elements">
              {contentData.header.buttonHeader && (
                <DsButton
                  variant="contained"
                  color="secondary"
                  iconLeft={contentData.header.buttonIcon}
                  dataTestId="content-header-button"
                  value={contentData.header.buttonTitle}
                  size="large"
                />
              )}
            </div>
          </div>
          <iframe
            src={contentData.iframe.src}
            width="100%"
            height="100%"
            style={{ border: "none" }}
            title="Analytics Dashboard"
          ></iframe>
        </div>
      </div>
    </div>
  );
}
