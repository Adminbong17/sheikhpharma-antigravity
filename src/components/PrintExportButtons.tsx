import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Printer, Download, Image, FileText, Receipt } from "lucide-react";
import { printTable, exportCSV, saveAsJpg, type PrintColumn, type PrintBranding } from "@/lib/printExport";
import { useSiteSettings } from "@/hooks/useSiteSettings";

interface PrintExportButtonsProps {
  title: string;
  columns: PrintColumn[];
  data: any[];
  ceoName?: string;
}

const PrintExportButtons = ({ title, columns, data, ceoName = "CEO" }: PrintExportButtonsProps) => {
  const { data: siteSettings } = useSiteSettings();

  const branding: PrintBranding = {
    logoUrl: siteSettings?.logo_url,
    siteName: siteSettings?.site_name,
    ceoName,
    officeAddress: (siteSettings as any)?.office_address,
    officePhone: (siteSettings as any)?.office_phone,
    officeEmail: (siteSettings as any)?.office_email,
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button size="sm" variant="outline" className="h-9 gap-1.5 text-xs">
          <Printer className="h-3.5 w-3.5" />
          Print / Export
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-52">
        <DropdownMenuItem onClick={() => printTable(title, columns, data, "a4", branding)}>
          <FileText className="h-4 w-4 mr-2" /> Print A4
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => printTable(title, columns, data, "pos", branding)}>
          <Receipt className="h-4 w-4 mr-2" /> Print POS (80mm)
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => printTable(title, columns, data, "pos56", branding)}>
          <Receipt className="h-4 w-4 mr-2" /> Print POS (56mm)
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={() => saveAsJpg(title, columns, data, "a4", branding)}>
          <Image className="h-4 w-4 mr-2" /> Save JPG (A4)
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => saveAsJpg(title, columns, data, "pos", branding)}>
          <Image className="h-4 w-4 mr-2" /> Save JPG (80mm)
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => saveAsJpg(title, columns, data, "pos56", branding)}>
          <Image className="h-4 w-4 mr-2" /> Save JPG (56mm)
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={() => exportCSV(title, columns, data)}>
          <Download className="h-4 w-4 mr-2" /> Export CSV
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

export default PrintExportButtons;
