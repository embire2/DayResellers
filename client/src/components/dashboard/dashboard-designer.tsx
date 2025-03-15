import { useState, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  rectSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Button } from "@/components/ui/button";
import { DashboardWidget } from "@shared/types";
import { useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Loader2 } from "lucide-react";

interface DashboardDesignerProps {
  widgets: DashboardWidget[];
  resellerId: number;
  onSave?: (widgets: DashboardWidget[]) => void;
}

function SortableWidget({ widget }: { widget: DashboardWidget }) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
  } = useSortable({ id: widget.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="cursor-move bg-white p-4 border rounded-md shadow-sm hover:shadow-md transition-shadow"
      {...attributes}
      {...listeners}
    >
      <div className="font-medium mb-2">{widget.title}</div>
      <div className="text-sm text-neutral-dark">Type: {widget.type}</div>
      <div className="text-sm text-neutral-dark mt-1">
        Size: {widget.width} x {widget.height}
      </div>
    </div>
  );
}

export function DashboardDesigner({ widgets: initialWidgets, resellerId, onSave }: DashboardDesignerProps) {
  const [widgets, setWidgets] = useState<DashboardWidget[]>(initialWidgets);
  const [availableWidgets, setAvailableWidgets] = useState<DashboardWidget[]>([
    {
      id: "stat-card-template",
      type: "stat-card",
      title: "Statistic Card",
      x: 0,
      y: 0,
      width: 1,
      height: 1,
    },
    {
      id: "product-table-template",
      type: "product-table",
      title: "Products Table",
      x: 0,
      y: 0,
      width: 3,
      height: 2,
    },
    {
      id: "client-list-template",
      type: "client-list",
      title: "Client List",
      x: 0,
      y: 0,
      width: 3,
      height: 2,
    },
    {
      id: "activity-feed-template",
      type: "activity-feed",
      title: "Activity Feed",
      x: 0,
      y: 0,
      width: 3,
      height: 2,
    },
  ]);

  const { toast } = useToast();
  const idCounter = useRef(0);

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const saveMutation = useMutation({
    mutationFn: async (data: { widgets: DashboardWidget[]; resellerId: number }) => {
      await apiRequest("POST", `/api/dashboards/${data.resellerId}`, { widgets: data.widgets });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/dashboards'] });
      toast({
        title: "Dashboard saved!",
        description: "The dashboard configuration has been saved successfully.",
      });
      if (onSave) {
        onSave(widgets);
      }
    },
    onError: (error) => {
      toast({
        title: "Error saving dashboard",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    
    if (over && active.id !== over.id) {
      setWidgets((items) => {
        const oldIndex = items.findIndex((item) => item.id === active.id);
        const newIndex = items.findIndex((item) => item.id === over.id);
        
        return arrayMove(items, oldIndex, newIndex);
      });
    }
  };

  const addWidget = (templateWidget: DashboardWidget) => {
    const newWidget = {
      ...templateWidget,
      id: `widget-${++idCounter.current}`,
    };
    
    setWidgets([...widgets, newWidget]);
  };

  const removeWidget = (widgetId: string) => {
    setWidgets(widgets.filter((w) => w.id !== widgetId));
  };

  const handleSave = () => {
    saveMutation.mutate({ widgets, resellerId });
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Available Widgets</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
            {availableWidgets.map((widget) => (
              <div
                key={widget.id}
                className="bg-white p-4 border rounded-md shadow-sm hover:shadow-md transition-shadow cursor-pointer"
                onClick={() => addWidget(widget)}
              >
                <div className="font-medium mb-2">{widget.title}</div>
                <div className="text-sm text-neutral-dark">Click to add to dashboard</div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Dashboard Layout</CardTitle>
          <Button onClick={handleSave} disabled={saveMutation.isPending}>
            {saveMutation.isPending ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Saving...
              </>
            ) : (
              "Save Layout"
            )}
          </Button>
        </CardHeader>
        <CardContent>
          <div className="bg-neutral-lighter p-4 rounded-md min-h-[400px]">
            <DndContext
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragEnd={handleDragEnd}
            >
              <SortableContext items={widgets.map(w => w.id)} strategy={rectSortingStrategy}>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {widgets.map((widget) => (
                    <div key={widget.id} className="relative">
                      <SortableWidget widget={widget} />
                      <button
                        className="absolute top-2 right-2 bg-white rounded-full p-1 shadow hover:bg-neutral-light"
                        onClick={() => removeWidget(widget.id)}
                      >
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          className="h-4 w-4 text-error"
                          viewBox="0 0 20 20"
                          fill="currentColor"
                        >
                          <path
                            fillRule="evenodd"
                            d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
                            clipRule="evenodd"
                          />
                        </svg>
                      </button>
                    </div>
                  ))}
                  {widgets.length === 0 && (
                    <div className="col-span-3 text-center py-12 border-2 border-dashed border-neutral rounded-md bg-white">
                      <p className="text-neutral-dark">Drag and drop widgets here to design the dashboard</p>
                    </div>
                  )}
                </div>
              </SortableContext>
            </DndContext>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
