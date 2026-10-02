import { useCurrency } from "@/contexts/CurrencyContext";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const CurrencySwitcher = () => {
  const { currencies, current, setCurrency } = useCurrency();

  return (
    <Select value={current.code} onValueChange={setCurrency}>
      <SelectTrigger className="h-8 w-[90px] bg-primary-foreground/10 border-primary-foreground/20 text-primary-foreground text-xs">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {currencies.map((c) => (
          <SelectItem key={c.code} value={c.code}>
            {c.symbol} {c.code}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
};

export default CurrencySwitcher;
