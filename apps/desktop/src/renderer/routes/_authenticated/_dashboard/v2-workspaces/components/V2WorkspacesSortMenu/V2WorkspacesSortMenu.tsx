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
	useV2WorkspacesFilterStore,
	V2_WORKSPACES_SORT_LABELS,
	V2_WORKSPACES_SORT_MODES,
	type V2WorkspacesSortMode,
} from "renderer/routes/_authenticated/_dashboard/v2-workspaces/stores/v2WorkspacesFilterStore";

interface V2WorkspacesSortMenuProps {
	labelClassName?: string;
}

export function V2WorkspacesSortMenu({
	labelClassName,
}: V2WorkspacesSortMenuProps) {
	const sortMode = useV2WorkspacesFilterStore((state) => state.sortMode);
	const setSortMode = useV2WorkspacesFilterStore((state) => state.setSortMode);

	return (
		<DropdownMenu modal={false}>
			<DropdownMenuTrigger asChild>
				<ToolbarMenuButton isActive={sortMode !== "activity"}>
					<LuArrowDownUp className="size-3.5" />
					<span className={labelClassName}>
						{V2_WORKSPACES_SORT_LABELS[sortMode]}
					</span>
					<LuChevronDown className="size-3 opacity-60" />
				</ToolbarMenuButton>
			</DropdownMenuTrigger>
			<DropdownMenuContent align="end" className="min-w-[10rem]">
				<DropdownMenuRadioGroup
					value={sortMode}
					onValueChange={(next) => setSortMode(next as V2WorkspacesSortMode)}
				>
					{V2_WORKSPACES_SORT_MODES.map((mode) => (
						<DropdownMenuRadioItem key={mode} value={mode}>
							{V2_WORKSPACES_SORT_LABELS[mode]}
						</DropdownMenuRadioItem>
					))}
				</DropdownMenuRadioGroup>
			</DropdownMenuContent>
		</DropdownMenu>
	);
}
