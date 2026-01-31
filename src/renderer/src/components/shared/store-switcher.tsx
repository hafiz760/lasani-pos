import { useState, useEffect } from "react";
import { Check, ChevronsUpDown, Store as StoreIcon } from "lucide-react";
import { cn } from "@renderer/lib/utils";
import { Button } from "@renderer/components/ui/button";
import {
    Command,
    CommandEmpty,
    CommandGroup,
    CommandInput,
    CommandItem,
    CommandList,
} from "@renderer/components/ui/command";
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@renderer/components/ui/popover";
import { toast } from "sonner";

export function StoreSwitcher() {
    const [open, setOpen] = useState(false);
    const [stores, setStores] = useState<any[]>([]);
    const [selectedStore, setSelectedStore] = useState<any>(null);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const savedStore = localStorage.getItem("selectedStore");
        if (savedStore) {
            setSelectedStore(JSON.parse(savedStore));
        }
        loadStores();
    }, []);

    const loadStores = async () => {
        setIsLoading(true);
        try {
            const userStr = localStorage.getItem("user");
            if (!userStr) return;
            const user = JSON.parse(userStr);

            const result = await window.api.users.getStores(user.id || user._id);
            if (result.success) {
                setStores(result.data.map((item: any) => item.store));

                // If no store selected but stores available, select first one
                if (!localStorage.getItem("selectedStore") && result.data.length > 0) {
                    const firstStore = result.data[0].store;
                    setSelectedStore(firstStore);
                    localStorage.setItem("selectedStore", JSON.stringify(firstStore));
                }
            }
        } catch (error) {
            console.error("Failed to load stores:", error);
        } finally {
            setIsLoading(false);
        }
    };

    const onStoreSelect = (store: any) => {
        setSelectedStore(store);
        localStorage.setItem("selectedStore", JSON.stringify(store));
        setOpen(false);
        toast.success(`Switched to ${store.name}`);
        window.location.reload(); // Hard reload to clear states across pages
    };

    return (
        <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger asChild>
                <Button
                    variant="outline"
                    role="combobox"
                    aria-expanded={open}
                    disabled={isLoading}
                    className="w-[200px] justify-between border-border bg-card hover:bg-accent text-card-foreground"
                >
                    <div className="flex items-center gap-2 truncate">
                        <StoreIcon className="h-4 w-4 text-[#4ade80]" />
                        {selectedStore ? selectedStore.name : "Select Store..."}
                    </div>
                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                </Button>
            </PopoverTrigger>
            <PopoverContent className="w-[200px] p-0 bg-popover border-border">
                <Command className="bg-popover text-popover-foreground">
                    <CommandInput placeholder="Search store..." className="border-none focus:ring-0" />
                    <CommandList>
                        <CommandEmpty>No store found.</CommandEmpty>
                        <CommandGroup>
                            {stores.map((store) => (
                                <CommandItem
                                    key={store._id}
                                    value={store.name}
                                    onSelect={() => onStoreSelect(store)}
                                    className="cursor-pointer focus:bg-[#4ade80] focus:text-black"
                                >
                                    <Check
                                        className={cn(
                                            "mr-2 h-4 w-4",
                                            selectedStore?._id === store._id ? "opacity-100" : "opacity-0"
                                        )}
                                    />
                                    {store.name}
                                </CommandItem>
                            ))}
                        </CommandGroup>
                    </CommandList>
                </Command>
            </PopoverContent>
        </Popover>
    );
}
