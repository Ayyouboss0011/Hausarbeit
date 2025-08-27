import { useState, useCallback, useEffect } from "react";
import { supabase } from "../lib/supabaseClient";
import { useDropzone } from "react-dropzone";
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
import { Plus, Edit, Trash2, Shield, AlertTriangle, UploadCloud, Loader2 } from "lucide-react";
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

export default function PolicyManagement() {
  const [policies, setPolicies] = useState<Policy[]>([]);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [editingPolicy, setEditingPolicy] = useState<Policy | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [newPolicy, setNewPolicy] = useState({
    name: "",
    description: "",
    keywords: "",
    severity: "medium" as const
  });
  const [file, setFile] = useState<File | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    fetchPolicies();
  }, []);

  const fetchPolicies = async () => {
    const { data, error } = await supabase.from("policymanagement").select();
    if (error) {
      console.error("Error fetching policies:", error);
      toast({
        title: "Error",
        description: "Could not fetch policies.",
        variant: "destructive",
      });
    } else {
      // Ensure keywords are arrays
      const formattedData = data.map(p => ({
        ...p,
        keywords: Array.isArray(p.keywords) ? p.keywords : p.keywords.split(',').map((k: string) => k.trim()),
      }));
      setPolicies(formattedData);
    }
  };

  const onDrop = useCallback((acceptedFiles: File[]) => {
    setFile(acceptedFiles[0]);
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'application/pdf': ['.pdf'],
      'text/plain': ['.txt'],
    },
    maxFiles: 1,
  });

  const handleAddPolicy = async () => {
    if (!file) {
      toast({
        title: "No File Selected",
        description: "Please upload a policy document.",
        variant: "destructive",
      });
      return;
    }

    setIsCreating(true);
    const formData = new FormData();
    formData.append("file", file);
    formData.append("name", newPolicy.name);
    formData.append("description", newPolicy.description);
    formData.append("keywords", newPolicy.keywords);
    formData.append("severity", newPolicy.severity);

    try {
      const response = await fetch("http://localhost:8000/upload-policy", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        throw new Error("Failed to upload policy");
      }

      const result = await response.json();

      const newPolicyData: Policy = {
        id: result.id,
        name: newPolicy.name,
        description: newPolicy.description,
        keywords: newPolicy.keywords.split(",").map(k => k.trim()),
        severity: newPolicy.severity,
        status: "active",
        created: new Date().toISOString().split('T')[0],
        lastModified: new Date().toISOString().split('T')[0]
      };

      const { error: insertError } = await supabase
        .from("policymanagement")
        .insert([newPolicyData]);

      if (insertError) {
        throw new Error(insertError.message);
      }

      setPolicies([...policies, newPolicyData]);
      setIsAddDialogOpen(false);
      setNewPolicy({ name: "", description: "", keywords: "", severity: "medium" });
      setFile(null);
      
      toast({
        title: "Policy Added",
        description: `${newPolicyData.name} has been created successfully.`,
      });
    } catch (error) {
      toast({
        title: "Upload Failed",
        description: "There was an error uploading the policy.",
        variant: "destructive",
      });
    } finally {
      setIsCreating(false);
    }
  };

  const handleDeletePolicy = async (id: string) => {
    setDeletingId(id);
    try {
      // 1. Delete from Supabase
      const { error: deleteError } = await supabase
        .from("policymanagement")
        .delete()
        .match({ id });

      if (deleteError) {
        toast({
          title: "Deletion Failed",
          description: "Could not delete policy from the database.",
          variant: "destructive",
        });
        return;
      }

      // 2. Delete from Qdrant via backend
      const response = await fetch(`http://localhost:8000/delete-policy/${id}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        throw new Error("Failed to delete policy from Qdrant");
      }

      setPolicies(policies.filter(p => p.id !== id));
      toast({
        title: "Policy Deleted",
        description: "The policy has been removed successfully.",
      });
    } catch (error) {
       toast({
        title: "Deletion Failed",
        description: "The policy was removed from the database, but failed to be removed from the vector store.",
        variant: "destructive",
      });
    } finally {
      setDeletingId(null);
    }
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
              <div className="grid gap-2">
                <Label>Upload Policy Document</Label>
                <div
                  {...getRootProps()}
                  className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer ${
                    isDragActive ? "border-guardian" : "border-neutral-300"
                  }`}
                >
                  <input {...getInputProps()} />
                  <UploadCloud className="w-12 h-12 mx-auto text-neutral-400" />
                  {file ? (
                    <p className="mt-2 text-neutral-600">{file.name}</p>
                  ) : (
                    <p className="mt-2 text-neutral-600">
                      {isDragActive
                        ? "Drop the file here..."
                        : "Drag 'n' drop a PDF or TXT file here, or click to select a file"}
                    </p>
                  )}
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsAddDialogOpen(false)} disabled={isCreating}>
                Cancel
              </Button>
              <Button onClick={handleAddPolicy} className="bg-guardian hover:bg-guardian-dark" disabled={isCreating}>
                {isCreating && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Create Policy
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
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
                      {deletingId === policy.id ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <>
                          <Button variant="ghost" size="sm" disabled={!!deletingId}>
                            <Edit className="w-4 h-4" />
                          </Button>
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button variant="ghost" size="sm" className="text-status-danger hover:text-status-danger" disabled={!!deletingId}>
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
                        </>
                      )}
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
