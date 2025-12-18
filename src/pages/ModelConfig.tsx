import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Navigate } from "react-router-dom";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { Pencil, Bot, Cpu, Zap, DollarSign } from "lucide-react";

interface ModelConfig {
  id: string;
  task_name: string;
  provider: string;
  model_id: string;
  fallback_model_id: string | null;
  temperature: number;
  max_tokens: number;
  description: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

const AVAILABLE_MODELS = [
  { id: "google/gemini-flash-1.5", name: "Gemini Flash 1.5", tier: "budget", context: "1M tokens" },
  { id: "google/gemini-pro-1.5", name: "Gemini Pro 1.5", tier: "standard", context: "2M tokens" },
  { id: "anthropic/claude-3.5-sonnet", name: "Claude 3.5 Sonnet", tier: "premium", context: "200K tokens" },
  { id: "anthropic/claude-3-haiku", name: "Claude 3 Haiku", tier: "budget", context: "200K tokens" },
  { id: "openai/gpt-4o", name: "GPT-4o", tier: "premium", context: "128K tokens" },
  { id: "openai/gpt-4o-mini", name: "GPT-4o Mini", tier: "budget", context: "128K tokens" },
];

const getTierColor = (tier: string) => {
  switch (tier) {
    case "budget": return "bg-green-500/10 text-green-600 border-green-500/20";
    case "standard": return "bg-blue-500/10 text-blue-600 border-blue-500/20";
    case "premium": return "bg-amber-500/10 text-amber-600 border-amber-500/20";
    default: return "bg-muted";
  }
};

const ModelConfig = () => {
  const { user, loading: authLoading } = useAuth();
  const queryClient = useQueryClient();
  const [editingConfig, setEditingConfig] = useState<ModelConfig | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);
  const [checkingRole, setCheckingRole] = useState(true);

  useEffect(() => {
    const checkSuperAdmin = async () => {
      if (!user) {
        setCheckingRole(false);
        return;
      }
      const { data } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', user.id)
        .eq('role', 'super_admin')
        .maybeSingle();
      setIsSuperAdmin(!!data);
      setCheckingRole(false);
    };
    checkSuperAdmin();
  }, [user]);

  const { data: configs, isLoading } = useQuery({
    queryKey: ["ai-model-configs"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("ai_model_config")
        .select("*")
        .order("task_name");
      if (error) throw error;
      return data as ModelConfig[];
    },
  });

  const updateMutation = useMutation({
    mutationFn: async (config: Partial<ModelConfig> & { id: string }) => {
      const { error } = await supabase
        .from("ai_model_config")
        .update({
          model_id: config.model_id,
          fallback_model_id: config.fallback_model_id,
          temperature: config.temperature,
          max_tokens: config.max_tokens,
          description: config.description,
          is_active: config.is_active,
        })
        .eq("id", config.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["ai-model-configs"] });
      toast.success("Model configuration updated");
      setIsDialogOpen(false);
      setEditingConfig(null);
    },
    onError: (error) => {
      toast.error("Failed to update configuration: " + error.message);
    },
  });

  const toggleActiveMutation = useMutation({
    mutationFn: async ({ id, is_active }: { id: string; is_active: boolean }) => {
      const { error } = await supabase
        .from("ai_model_config")
        .update({ is_active })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["ai-model-configs"] });
      toast.success("Configuration toggled");
    },
  });

  if (authLoading || checkingRole) return null;
  
  if (!isSuperAdmin) {
    return <Navigate to="/dashboard" replace />;
  }

  const handleEdit = (config: ModelConfig) => {
    setEditingConfig(config);
    setIsDialogOpen(true);
  };

  const handleSave = () => {
    if (!editingConfig) return;
    updateMutation.mutate(editingConfig);
  };

  const getModelInfo = (modelId: string) => {
    return AVAILABLE_MODELS.find(m => m.id === modelId);
  };

  const formatTaskName = (taskName: string) => {
    return taskName
      .split("_")
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(" ");
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">AI Model Configuration</h1>
          <p className="text-muted-foreground mt-1">
            Configure which AI models power each feature. Changes take effect immediately.
          </p>
        </div>

        {/* Stats Cards */}
        <div className="grid gap-4 md:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Active Tasks</CardTitle>
              <Bot className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {configs?.filter(c => c.is_active).length || 0}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Using Gemini</CardTitle>
              <Zap className="h-4 w-4 text-green-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {configs?.filter(c => c.model_id.includes("gemini")).length || 0}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Using Claude</CardTitle>
              <Cpu className="h-4 w-4 text-amber-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {configs?.filter(c => c.model_id.includes("claude")).length || 0}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Cost Tier</CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">Budget</div>
            </CardContent>
          </Card>
        </div>

        {/* Config Table */}
        <Card>
          <CardHeader>
            <CardTitle>Model Assignments</CardTitle>
            <CardDescription>
              Each task uses a primary model with an optional fallback if the primary fails.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="text-center py-8 text-muted-foreground">Loading configurations...</div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Task</TableHead>
                    <TableHead>Primary Model</TableHead>
                    <TableHead>Fallback Model</TableHead>
                    <TableHead>Temperature</TableHead>
                    <TableHead>Max Tokens</TableHead>
                    <TableHead>Active</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {configs?.map((config) => {
                    const primaryModel = getModelInfo(config.model_id);
                    const fallbackModel = config.fallback_model_id ? getModelInfo(config.fallback_model_id) : null;
                    
                    return (
                      <TableRow key={config.id}>
                        <TableCell>
                          <div>
                            <div className="font-medium">{formatTaskName(config.task_name)}</div>
                            {config.description && (
                              <div className="text-sm text-muted-foreground">{config.description}</div>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <span className="font-mono text-sm">{primaryModel?.name || config.model_id}</span>
                            {primaryModel && (
                              <Badge variant="outline" className={getTierColor(primaryModel.tier)}>
                                {primaryModel.tier}
                              </Badge>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          {fallbackModel ? (
                            <span className="font-mono text-sm text-muted-foreground">
                              {fallbackModel.name}
                            </span>
                          ) : (
                            <span className="text-muted-foreground">None</span>
                          )}
                        </TableCell>
                        <TableCell>
                          <Badge variant="secondary">{config.temperature}</Badge>
                        </TableCell>
                        <TableCell>
                          <span className="text-muted-foreground">{config.max_tokens.toLocaleString()}</span>
                        </TableCell>
                        <TableCell>
                          <Switch
                            checked={config.is_active}
                            onCheckedChange={(checked) => 
                              toggleActiveMutation.mutate({ id: config.id, is_active: checked })
                            }
                          />
                        </TableCell>
                        <TableCell className="text-right">
                          <Button variant="ghost" size="sm" onClick={() => handleEdit(config)}>
                            <Pencil className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        {/* Edit Dialog */}
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogContent className="sm:max-w-[500px]">
            <DialogHeader>
              <DialogTitle>Edit Model Configuration</DialogTitle>
              <DialogDescription>
                {editingConfig && formatTaskName(editingConfig.task_name)}
              </DialogDescription>
            </DialogHeader>
            
            {editingConfig && (
              <div className="grid gap-4 py-4">
                <div className="space-y-2">
                  <Label>Primary Model</Label>
                  <Select
                    value={editingConfig.model_id}
                    onValueChange={(value) => setEditingConfig({ ...editingConfig, model_id: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {AVAILABLE_MODELS.map((model) => (
                        <SelectItem key={model.id} value={model.id}>
                          <div className="flex items-center gap-2">
                            <span>{model.name}</span>
                            <Badge variant="outline" className={`text-xs ${getTierColor(model.tier)}`}>
                              {model.tier}
                            </Badge>
                            <span className="text-xs text-muted-foreground">{model.context}</span>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Fallback Model</Label>
                  <Select
                    value={editingConfig.fallback_model_id || "none"}
                    onValueChange={(value) => setEditingConfig({ 
                      ...editingConfig, 
                      fallback_model_id: value === "none" ? null : value 
                    })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">No fallback</SelectItem>
                      {AVAILABLE_MODELS.map((model) => (
                        <SelectItem key={model.id} value={model.id}>
                          {model.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Temperature</Label>
                    <Input
                      type="number"
                      step="0.1"
                      min="0"
                      max="2"
                      value={editingConfig.temperature}
                      onChange={(e) => setEditingConfig({ 
                        ...editingConfig, 
                        temperature: parseFloat(e.target.value) || 0 
                      })}
                    />
                    <p className="text-xs text-muted-foreground">0 = deterministic, 1 = creative</p>
                  </div>

                  <div className="space-y-2">
                    <Label>Max Tokens</Label>
                    <Input
                      type="number"
                      step="1024"
                      min="1024"
                      max="128000"
                      value={editingConfig.max_tokens}
                      onChange={(e) => setEditingConfig({ 
                        ...editingConfig, 
                        max_tokens: parseInt(e.target.value) || 4096 
                      })}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Description</Label>
                  <Textarea
                    value={editingConfig.description || ""}
                    onChange={(e) => setEditingConfig({ ...editingConfig, description: e.target.value })}
                    placeholder="Describe what this task does..."
                  />
                </div>
              </div>
            )}

            <DialogFooter>
              <Button variant="outline" onClick={() => setIsDialogOpen(false)}>Cancel</Button>
              <Button onClick={handleSave} disabled={updateMutation.isPending}>
                {updateMutation.isPending ? "Saving..." : "Save Changes"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
};

export default ModelConfig;
