export interface KanbanCard {
  id: string;
  columnId: string; // References KanbanColumn.id
  title: string;
  imageUrl?: string;
  assignee?: string;
  dateCreated: string; // ISO 8601 format
  dateUpdated: string; // ISO 8601 format
  material?: string;
  machine?: string;
  dueDate?: string; // ISO 8601 format - optional due date
  content?: string; // Markdown format - optional notes/description
}

export interface KanbanCardsData {
  cards: KanbanCard[];
}

