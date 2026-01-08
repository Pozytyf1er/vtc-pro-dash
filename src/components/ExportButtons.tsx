import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Download, FileText, FileSpreadsheet } from "lucide-react";
import { useTranslation } from "react-i18next";

interface ExportButtonsProps {
  onExportPDF: () => void;
  onExportCSV: () => void;
  disabled?: boolean;
}

export function ExportButtons({ onExportPDF, onExportCSV, disabled }: ExportButtonsProps) {
  const { t } = useTranslation();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" disabled={disabled}>
          <Download className="mr-2 h-4 w-4" />
          {t('common.export')}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={onExportPDF}>
          <FileText className="mr-2 h-4 w-4" />
          {t('common.exportPDF')}
        </DropdownMenuItem>
        <DropdownMenuItem onClick={onExportCSV}>
          <FileSpreadsheet className="mr-2 h-4 w-4" />
          {t('common.exportCSV')}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
