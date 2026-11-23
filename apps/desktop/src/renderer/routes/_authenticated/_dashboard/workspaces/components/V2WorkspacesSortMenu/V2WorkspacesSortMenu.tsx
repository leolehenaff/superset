import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuRadioGroup,
	DropdownMenuRadioItem,
	DropdownMenuTrigger,
} from "@superset/ui/dropdown-menu";
import { LuArrowDownUp, LuChevronDown } from "react-icons/lu";
import { ToolbarMenuButton } from "renderer/routes/_authenticated/_dashboard/components/ToolbarMenuButton";
import {
	ORDER_BY_LABELS,
	ORDER_BY_VALUES,
	useWorkspacesFilterStore,
	type V2WorkspacesOrderBy,
} from "renderer/routes/_authenticated/_dashboard/workspaces/stores/workspacesFilterStore";

interface V2WorkspacesSortMenuProps {
	labelClassName?: string;
}

export function V2WorkspacesSortMenu({
	labelClassName,
}: V2WorkspacesSortMenuProps) {
	const orderBy = useWorkspacesFilterStore((state) => state.orderBy);
	const setOrderBy = useWorkspacesFilterStore((state) => state.setOrderBy);

	return (
		<DropdownMenu modal={false}>
			<DropdownMenuTrigger asChild>
				<ToolbarMenuButton isActive={orderBy !== "activity"}>
					<LuArrowDownUp className="size-3.5" />
					<span className={labelClassName}>{ORDER_BY_LABELS[orderBy]}</span>
					<LuChevronDown className="size-3 opacity-60" />
				</ToolbarMenuButton>
			</DropdownMenuTrigger>
			<DropdownMenuContent align="end" className="min-w-[10rem]">
				<DropdownMenuRadioGroup
					value={orderBy}
					onValueChange={(next) => setOrderBy(next as V2WorkspacesOrderBy)}
				>
					{ORDER_BY_VALUES.map((mode) => (
						<DropdownMenuRadioItem key={mode} value={mode}>
							{ORDER_BY_LABELS[mode]}
						</DropdownMenuRadioItem>
					))}
				</DropdownMenuRadioGroup>
			</DropdownMenuContent>
		</DropdownMenu>
	);
}
