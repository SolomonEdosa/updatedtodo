"use client";

import React, {
  useState,
  useEffect,
  useRef,
  ChangeEvent,
  FormEvent,
} from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  PlusCircle,
  Trash2,
  Moon,
  Sun,
  XCircle,
  Edit2,
  Save,
  Search,
  Square,
  ArrowUpDown,
} from "lucide-react";

interface Todo {
  id: string;
  text: string;
  completed: boolean;
  createdAt: string;
  priority: "low" | "medium" | "high";
}

interface SortableItemProps {
  todo: Todo;
  onToggle: (id: string) => void;
  onDelete: (id: string) => void;
  onStartEdit: (id: string) => void;
  onSaveEdit: (id: string) => void;
  onChangeText: (id: string, text: string) => void;
  editingId: string | null;
}

import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragOverlay,
  DragStartEvent,
  DragEndEvent,
} from "@dnd-kit/core";

import {
  arrayMove,
  SortableContext,
  verticalListSortingStrategy,
  useSortable,
} from "@dnd-kit/sortable";

import { CSS } from "@dnd-kit/utilities";

/* -------------------------
  Utilities
------------------------- */
const uid = (): string =>
  Date.now() + "-" + Math.floor(Math.random() * 10000);

const defaultTodos: Todo[] = [];

const priorityClasses: Record<Todo["priority"], string> = {
  low: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300",
  medium:
    "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300",
  high: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300",
};

/* -------------------------
  SortableItem
------------------------- */
function SortableItem({
  todo,
  onToggle,
  onDelete,
  onStartEdit,
  onSaveEdit,
  onChangeText,
  editingId,
}: SortableItemProps) {
  const { attributes, listeners, setNodeRef, transform, transition } =
    useSortable({ id: todo.id });

  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <motion.li
      ref={setNodeRef}
      style={style}
      layout
      initial={{ opacity: 0, y: -6 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, x: 50 }}
      className="flex items-center justify-between bg-gray-100 dark:bg-gray-700 px-4 py-3 rounded-xl"
    >
      <div className="flex items-center gap-3 w-full">
        <input
          type="checkbox"
          checked={todo.completed}
          onChange={() => onToggle(todo.id)}
          className="w-5 h-5 accent-blue-500"
        />

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 justify-between">
            {editingId === todo.id ? (
              <input
                value={todo.text}
                onChange={(e) => onChangeText(todo.id, e.target.value)}
                className="w-full px-2 py-1 rounded-md bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600"
                autoFocus
              />
            ) : (
              <div className="flex items-center gap-2 min-w-0">
                <span
                  className={`truncate transition-all ${
                    todo.completed
                      ? "line-through text-gray-400 dark:text-gray-400"
                      : ""
                  }`}
                >
                  {todo.text}
                </span>
                {todo.priority ? (
                  <span
                    className={`text-xs px-2 py-0.5 rounded-full ${
                      priorityClasses[todo.priority]
                    }`}
                  >
                    {todo.priority[0].toUpperCase() + todo.priority.slice(1)}
                  </span>
                ) : null}
              </div>
            )}

            <div className="flex items-center gap-2 ml-3">
              <div
                {...attributes}
                {...listeners}
                className="p-1 rounded-md hover:bg-gray-200 dark:hover:bg-gray-600 cursor-grab"
                title="Drag to reorder"
              >
                <ArrowUpDown size={16} />
              </div>

              {editingId === todo.id ? (
                <button
                  onClick={() => onSaveEdit(todo.id)}
                  className="p-1 rounded-md hover:bg-gray-200 dark:hover:bg-gray-600"
                  title="Save"
                >
                  <Save size={16} />
                </button>
              ) : (
                <button
                  onClick={() => onStartEdit(todo.id)}
                  className="p-1 rounded-md hover:bg-gray-200 dark:hover:bg-gray-600"
                  title="Edit"
                >
                  <Edit2 size={16} />
                </button>
              )}

              <button
                onClick={() => onDelete(todo.id)}
                className="text-red-500 hover:text-red-600 p-1 rounded-md"
                title="Delete"
              >
                <Trash2 size={16} />
              </button>
            </div>
          </div>
        </div>
      </div>
    </motion.li>
  );
}

/* -------------------------
  Main Component
------------------------- */
export default function Home() {
  const [task, setTask] = useState<string>("");
  const [todos, setTodos] = useState<Todo[]>(defaultTodos);
  const [darkMode, setDarkMode] = useState<boolean>(false);
  const [filter, setFilter] = useState<"all" | "active" | "completed">("all");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [search, setSearch] = useState<string>("");
  const [sortBy, setSortBy] = useState<"created" | "priority">("created");
  const [lastDeleted, setLastDeleted] = useState<Todo | null>(null);
  const undoTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const sensors = useSensors(useSensor(PointerSensor), useSensor(KeyboardSensor));

  // Load + Persist
  useEffect(() => {
    const saved = JSON.parse(localStorage.getItem("todos") || "[]") as Todo[];
    setTodos(saved);
    const savedDark = localStorage.getItem("darkMode") === "true";
    setDarkMode(savedDark);
    document.documentElement.classList.toggle("dark", savedDark);
  }, []);

  useEffect(() => {
    localStorage.setItem("todos", JSON.stringify(todos));
  }, [todos]);

  useEffect(() => {
    localStorage.setItem("darkMode", String(darkMode));
    document.documentElement.classList.toggle("dark", darkMode);
  }, [darkMode]);

  const addTodo = (e?: FormEvent) => {
    e?.preventDefault();
    if (!task.trim()) return;
    const newTodo: Todo = {
      id: uid(),
      text: task.trim(),
      completed: false,
      createdAt: new Date().toISOString(),
      priority: "medium",
    };
    setTodos((s) => [newTodo, ...s]);
    setTask("");
  };

  const deleteTodo = (id: string) => {
    const removed = todos.find((t) => t.id === id);
    if (!removed) return;
    setTodos((s) => s.filter((t) => t.id !== id));
    setLastDeleted(removed);
    if (undoTimerRef.current) clearTimeout(undoTimerRef.current);
    undoTimerRef.current = setTimeout(() => {
      setLastDeleted(null);
      undoTimerRef.current = null;
    }, 6000);
  };

  const undoDelete = () => {
    if (!lastDeleted) return;
    setTodos((s) => [lastDeleted, ...s]);
    setLastDeleted(null);
    if (undoTimerRef.current) clearTimeout(undoTimerRef.current);
  };

  const toggleComplete = (id: string) => {
    setTodos((s) =>
      s.map((t) => (t.id === id ? { ...t, completed: !t.completed } : t))
    );
  };

  const startEdit = (id: string) => setEditingId(id);
  const changeText = (id: string, text: string) =>
    setTodos((s) => s.map((t) => (t.id === id ? { ...t, text } : t)));
  const saveEdit = () => setEditingId(null);

  const clearCompleted = () => setTodos((s) => s.filter((t) => !t.completed));

  // Filters + search
  const filtered = todos.filter((t) => {
    if (filter === "active" && t.completed) return false;
    if (filter === "completed" && !t.completed) return false;
    if (
      search.trim() &&
      !t.text.toLowerCase().includes(search.toLowerCase())
    )
      return false;
    return true;
  });

  // Sorting
  const sortTodos = (list: Todo[]): Todo[] => {
    const copy = [...list];
    if (sortBy === "created")
      return copy.sort(
        (a, b) => +new Date(b.createdAt) - +new Date(a.createdAt)
      );
    if (sortBy === "priority") {
      const order = { high: 0, medium: 1, low: 2 } as Record<
        Todo["priority"],
        number
      >;
      return copy.sort(
        (a, b) => (order[a.priority] ?? 3) - (order[b.priority] ?? 3)
      );
    }
    return copy;
  };

  const visible = sortTodos(filtered);

  // DnD
  const [activeId, setActiveId] = useState<string | null>(null);

  function handleDragStart(event: DragStartEvent) {
    setActiveId(event.active.id as string);
  }

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    setActiveId(null);
    if (active.id !== over?.id) {
      const oldIndex = visible.findIndex((t) => t.id === active.id);
      const newIndex = visible.findIndex((t) => t.id === over?.id);
      if (oldIndex >= 0 && newIndex >= 0) {
        const visibleIds = visible.map((t) => t.id);
        const reorderedIds = arrayMove(visibleIds, oldIndex, newIndex);
        const idToTodo = Object.fromEntries(
          todos.map((t) => [t.id, t])
        ) as Record<string, Todo>;
        const newOrder = reorderedIds.map((id) => idToTodo[id]).filter(Boolean);
        const rest = todos.filter((t) => !reorderedIds.includes(t.id));
        setTodos([...newOrder, ...rest]);
      }
    }
  }

  const activeCount = todos.filter((t) => !t.completed).length;
  const completedCount = todos.filter((t) => t.completed).length;

  return (
    <div className="w-full max-w-4xl mx-auto bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-6 transition-colors">
      {/* Header */}
      {/* (header code stays exactly the same as your original, omitted here for brevity) */}

      {/* Add */}
      {/* (form code stays exactly the same as your original) */}

      {/* Todo list */}
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
      >
        <SortableContext
          items={visible.map((t) => t.id)}
          strategy={verticalListSortingStrategy}
        >
          <ul className="space-y-3">
            <AnimatePresence>
              {visible.map((todo) => (
                <SortableItem
                  key={todo.id}
                  todo={todo}
                  onToggle={toggleComplete}
                  onDelete={deleteTodo}
                  onStartEdit={startEdit}
                  onSaveEdit={saveEdit}
                  onChangeText={changeText}
                  editingId={editingId}
                />
              ))}
            </AnimatePresence>
          </ul>
        </SortableContext>

        <DragOverlay>
          {activeId ? (
            <div className="w-full max-w-3xl bg-gray-200 dark:bg-gray-600 px-4 py-3 rounded-xl">
              <strong className="truncate block">
                {todos.find((t) => t.id === activeId)?.text}
              </strong>
            </div>
          ) : null}
        </DragOverlay>
      </DndContext>
    </div>
  );
}
