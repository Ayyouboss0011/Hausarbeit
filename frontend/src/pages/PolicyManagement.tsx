import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Plus, Edit, Trash2, Shield, AlertTriangle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface Policy {
  id: string;
  name: string;
  description: string;
  keywords: string[];
  severity: "low" | "medium" | "high";
  status: "active" | "inactive";
  created: string;
  lastModified: string;
}

const mockPolicies: Policy[] = [
  {
    id: "1",
    name: "Financial Data Protection",
    description: "Prevents sharing of financial projections, budgets, and revenue data",
    keywords: ["revenue", "budget", "financial", "profit", "earnings"],
    severity: "high",
    status: "active",
    created: "2024-01-15",
    lastModified: "2024-01-18"
  },
  {
    id: "2",
    name: "Customer PII Protection",
    description: "Blocks personally identifiable information about customers",
    keywords: ["email", "phone", "address", "ssn", "customer data"],
    severity: "high",
    status: "active",
    created: "2024-01-10",
    lastModified: "2024-01-16"
  },
  {
    id: "3",
    name: "Internal Project Names",
    description: "Prevents disclosure of confidential project codenames",
    keywords: ["project alpha", "project beta", "codename", "internal project"],
    severity: "medium",
    status: "active",
    created: "2024-01-12",
    lastModified: "2024-01-17"
  }
];

export default function PolicyManagement() {
  const [policies, setPolicies] = useState<Policy[]>(mockPolicies);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [editingPolicy, setEditingPolicy] = useState<Policy | null>(null);
  const [newPolicy, setNewPolicy] = useState({
    name: "",
    description: "",
    keywords: "",
    severity: "medium" as const
  });
  const { toast } = useToast();

  const handleAddPolicy = () => {
    const policy: Policy = {
      id: Date.now().toString(),
      name: newPolicy.name,
      description: newPolicy.description,
      keywords: newPolicy.keywords.split(",").map(k => k.trim()),
      severity: newPolicy.severity,
      status: "active",
      created: new Date().toISOString().split('T')[0],
      lastModified: new Date().toISOString().split('T')[0]
    };

    setPolicies([...policies, policy]);
    setIsAddDialogOpen(false);
    setNewPolicy({ name: "", description: "", keywords: "", severity: "medium" });
    
    toast({
      title: "Policy Added",
      description: `${policy.name} has been created successfully.`,
    });
  };

  const handleDeletePolicy = (id: string) => {
    setPolicies(policies.filter(p => p.id !== id));
    toast({
      title: "Policy Deleted",
      description: "The policy has been removed successfully.",
    });
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case "high": return "bg-status-danger text-white";
      case "medium": return "bg-status-warning text-white";
      case "low": return "bg-neutral-500 text-white";
      default: return "bg-neutral-500 text-white";
    }
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-neutral-900">Policy Management</h1>
          <p className="text-neutral-600">Configure security rules and content validation policies</p>
        </div>
        <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
          <DialogTrigger asChild>
            <Button className="flex items-center space-x-2 bg-guardian hover:bg-guardian-dark">
              <Plus className="w-4 h-4" />
              <span>Add Policy</span>
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[525px] bg-white">
            <DialogHeader>
              <DialogTitle>Create New Policy</DialogTitle>
              <DialogDescription>
                Define a new security policy to monitor AI outputs for specific content.
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label htmlFor="name">Policy Name</Label>
                <Input
                  id="name"
                  value={newPolicy.name}
                  onChange={(e) => setNewPolicy({...newPolicy, name: e.target.value})}
                  placeholder="e.g., Customer Data Protection"
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={newPolicy.description}
                  onChange={(e) => setNewPolicy({...newPolicy, description: e.target.value})}
                  placeholder="Describe what this policy protects against..."
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="keywords">Keywords (comma-separated)</Label>
                <Input
                  id="keywords"
                  value={newPolicy.keywords}
                  onChange={(e) => setNewPolicy({...newPolicy, keywords: e.target.value})}
                  placeholder="e.g., confidential, secret, internal"
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="severity">Severity Level</Label>
                <Select value={newPolicy.severity} onValueChange={(value: any) => setNewPolicy({...newPolicy, severity: value})}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select severity" />
                  </SelectTrigger>
                  <SelectContent className="bg-white border border-neutral-200">
                    <SelectItem value="low">Low</SelectItem>
                    <SelectItem value="medium">Medium</SelectItem>
                    <SelectItem value="high">High</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsAddDialogOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleAddPolicy} className="bg-guardian hover:bg-guardian-dark">
                Create Policy
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="shadow-card border-card-border">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-neutral-600">Total Policies</p>
                <p className="text-2xl font-bold text-neutral-900">{policies.length}</p>
              </div>
              <Shield className="w-8 h-8 text-guardian" />
            </div>
          </CardContent>
        </Card>
        <Card className="shadow-card border-card-border">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-neutral-600">Active Policies</p>
                <p className="text-2xl font-bold text-status-safe">{policies.filter(p => p.status === 'active').length}</p>
              </div>
              <div className="w-8 h-8 bg-status-safe/10 rounded-full flex items-center justify-center">
                <Shield className="w-4 h-4 text-status-safe" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="shadow-card border-card-border">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-neutral-600">High Severity</p>
                <p className="text-2xl font-bold text-status-danger">{policies.filter(p => p.severity === 'high').length}</p>
              </div>
              <AlertTriangle className="w-8 h-8 text-status-danger" />
            </div>
          </CardContent>
        </Card>
        <Card className="shadow-card border-card-border">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-neutral-600">Triggers Today</p>
                <p className="text-2xl font-bold text-neutral-900">47</p>
              </div>
              <div className="w-8 h-8 bg-guardian/10 rounded-full flex items-center justify-center">
                <span className="text-sm font-bold text-guardian">47</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Policies Table */}
      <Card className="shadow-card border-card-border">
        <CardHeader>
          <CardTitle className="text-lg font-semibold text-neutral-900">Security Policies</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Policy Name</TableHead>
                <TableHead>Description</TableHead>
                <TableHead>Keywords</TableHead>
                <TableHead>Severity</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Last Modified</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {policies.map((policy) => (
                <TableRow key={policy.id}>
                  <TableCell className="font-medium">{policy.name}</TableCell>
                  <TableCell className="max-w-xs">
                    <div className="truncate" title={policy.description}>
                      {policy.description}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-wrap gap-1">
                      {policy.keywords.slice(0, 3).map((keyword, index) => (
                        <Badge key={index} variant="outline" className="text-xs">
                          {keyword}
                        </Badge>
                      ))}
                      {policy.keywords.length > 3 && (
                        <Badge variant="outline" className="text-xs">
                          +{policy.keywords.length - 3}
                        </Badge>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge className={getSeverityColor(policy.severity)}>
                      {policy.severity.toUpperCase()}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Badge 
                      variant={policy.status === "active" ? "default" : "secondary"}
                      className={policy.status === "active" ? "bg-status-safe text-white" : ""}
                    >
                      {policy.status}
                    </Badge>
                  </TableCell>
                  <TableCell>{policy.lastModified}</TableCell>
                  <TableCell>
                    <div className="flex items-center space-x-2">
                      <Button variant="ghost" size="sm">
                        <Edit className="w-4 h-4" />
                      </Button>
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button variant="ghost" size="sm" className="text-status-danger hover:text-status-danger">
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent className="bg-white">
                          <AlertDialogHeader>
                            <AlertDialogTitle>Delete Policy</AlertDialogTitle>
                            <AlertDialogDescription>
                              Are you sure you want to delete "{policy.name}"? This action cannot be undone.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction 
                              onClick={() => handleDeletePolicy(policy.id)}
                              className="bg-status-danger hover:bg-status-danger/90"
                            >
                              Delete
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}