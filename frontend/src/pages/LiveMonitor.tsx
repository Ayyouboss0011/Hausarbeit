import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { CheckCircle, AlertTriangle, ChevronDown, ChevronUp, Play, Pause, Filter } from "lucide-react";

interface AIOutput {
  id: string;
  timestamp: string;
  originalResponse: string;
  safetyLevel: "safe" | "not safe";
  reason: string;
  userId: string;
  policyTriggered?: string;
}

// Mock real-time data
const mockOutputs: AIOutput[] = [
  {
    id: "1",
    timestamp: "2024-01-20 14:32:15",
    originalResponse: "Based on our internal financial projections for Q4, I can share that the company expects to see a 15% increase in revenue. However, I should note that this information includes sensitive budget details that shouldn't be shared externally.",
    safetyLevel: "not safe",
    reason: "Contains sensitive financial information",
    userId: "john.doe@company.com",
    policyTriggered: "Financial Data Protection"
  },
  {
    id: "2",
    timestamp: "2024-01-20 14:31:48",
    originalResponse: "Here are some general best practices for project management that could help improve your team's efficiency: 1) Set clear objectives and milestones, 2) Regular team check-ins, 3) Use project management tools like Jira or Asana.",
    safetyLevel: "safe",
    reason: "Contains only general business advice",
    userId: "sarah.smith@company.com"
  },
  {
    id: "3",
    timestamp: "2024-01-20 14:30:22",
    originalResponse: "I can help you with customer support strategies. For handling customer complaints, consider implementing a tiered support system and training staff on de-escalation techniques.",
    safetyLevel: "safe",
    reason: "General customer service guidance",
    userId: "mike.jones@company.com"
  }
];

export default function LiveMonitor() {
  const [outputs, setOutputs] = useState<AIOutput[]>(mockOutputs);
  const [isLive, setIsLive] = useState(true);
  const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set());

  // Simulate real-time updates
  useEffect(() => {
    if (!isLive) return;

    const interval = setInterval(() => {
      const newOutput: AIOutput = {
        id: Date.now().toString(),
        timestamp: new Date().toLocaleString(),
        originalResponse: "Sample AI response for demonstration purposes...",
        safetyLevel: Math.random() > 0.8 ? "not safe" : "safe",
        reason: Math.random() > 0.8 ? "Potential sensitive content detected" : "Content approved for sharing",
        userId: "user@company.com"
      };

      setOutputs(prev => [newOutput, ...prev].slice(0, 50)); // Keep only recent 50
    }, 5000);

    return () => clearInterval(interval);
  }, [isLive]);

  const toggleExpanded = (id: string) => {
    const newExpanded = new Set(expandedItems);
    if (newExpanded.has(id)) {
      newExpanded.delete(id);
    } else {
      newExpanded.add(id);
    }
    setExpandedItems(newExpanded);
  };

  const safeCount = outputs.filter(o => o.safetyLevel === "safe").length;
  const unsafeCount = outputs.filter(o => o.safetyLevel === "not safe").length;

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-neutral-900">Live Monitor</h1>
          <p className="text-neutral-600">Real-time AI output analysis and validation</p>
        </div>
        <div className="flex items-center space-x-3">
          <Button
            onClick={() => setIsLive(!isLive)}
            variant={isLive ? "default" : "outline"}
            className="flex items-center space-x-2"
          >
            {isLive ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
            <span>{isLive ? "Pause" : "Resume"} Live Feed</span>
          </Button>
          <Button variant="outline" className="flex items-center space-x-2">
            <Filter className="w-4 h-4" />
            <span>Filter</span>
          </Button>
        </div>
      </div>

      {/* Status Overview */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="shadow-card border-card-border">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-neutral-600">Total Outputs</p>
                <p className="text-2xl font-bold text-neutral-900">{outputs.length}</p>
              </div>
              <div className="w-10 h-10 bg-guardian/10 rounded-lg flex items-center justify-center">
                <span className="text-lg font-bold text-guardian">{outputs.length}</span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-card border-card-border">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-neutral-600">Safe Outputs</p>
                <p className="text-2xl font-bold text-status-safe">{safeCount}</p>
              </div>
              <CheckCircle className="w-10 h-10 text-status-safe" />
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-card border-card-border">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-neutral-600">Blocked Outputs</p>
                <p className="text-2xl font-bold text-status-danger">{unsafeCount}</p>
              </div>
              <AlertTriangle className="w-10 h-10 text-status-danger" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Live Feed */}
      <Card className="shadow-card border-card-border">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-lg font-semibold text-neutral-900">Live AI Output Stream</CardTitle>
          <div className="flex items-center space-x-2">
            <div className={`w-2 h-2 rounded-full ${isLive ? 'bg-status-safe animate-pulse' : 'bg-neutral-400'}`} />
            <span className="text-sm text-neutral-600">{isLive ? 'Live' : 'Paused'}</span>
          </div>
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-96">
            <div className="space-y-4">
              {outputs.map((output) => (
                <Collapsible
                  key={output.id}
                  open={expandedItems.has(output.id)}
                  onOpenChange={() => toggleExpanded(output.id)}
                >
                  <div className="border border-neutral-200 rounded-lg p-4 hover:shadow-sm transition-shadow">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center space-x-3">
                        <Badge
                          variant={output.safetyLevel === "safe" ? "default" : "destructive"}
                          className={
                            output.safetyLevel === "safe"
                              ? "bg-status-safe text-white"
                              : "bg-status-danger text-white"
                          }
                        >
                          {output.safetyLevel === "safe" ? (
                            <CheckCircle className="w-3 h-3 mr-1" />
                          ) : (
                            <AlertTriangle className="w-3 h-3 mr-1" />
                          )}
                          {output.safetyLevel === "safe" ? "Safe" : "Blocked"}
                        </Badge>
                        <span className="text-sm text-neutral-600">{output.timestamp}</span>
                        <span className="text-sm text-neutral-500">User: {output.userId}</span>
                      </div>
                      <CollapsibleTrigger asChild>
                        <Button variant="ghost" size="sm">
                          {expandedItems.has(output.id) ? (
                            <ChevronUp className="w-4 h-4" />
                          ) : (
                            <ChevronDown className="w-4 h-4" />
                          )}
                        </Button>
                      </CollapsibleTrigger>
                    </div>

                    <div className="mb-2">
                      <p className="text-sm font-medium text-neutral-900 mb-1">Analysis Result:</p>
                      <p className="text-sm text-neutral-700">{output.reason}</p>
                      {output.policyTriggered && (
                        <p className="text-xs text-status-danger mt-1">
                          Policy triggered: {output.policyTriggered}
                        </p>
                      )}
                    </div>

                    <CollapsibleContent className="space-y-3">
                      <div>
                        <p className="text-sm font-medium text-neutral-900 mb-2">Original AI Response:</p>
                        <div className="bg-neutral-50 p-3 rounded-md">
                          <p className="text-sm text-neutral-700">{output.originalResponse}</p>
                        </div>
                      </div>

                      <div>
                        <p className="text-sm font-medium text-neutral-900 mb-2">GuardianAI Decision:</p>
                        <div className="bg-neutral-800 p-3 rounded-md">
                          <pre className="text-xs text-green-400 font-mono">
{`{
  "safetyLevel": "${output.safetyLevel}",
  "reason": "${output.reason}",
  "confidence": ${Math.floor(Math.random() * 30 + 70)},
  "timestamp": "${output.timestamp}",
  "policyTriggered": ${output.policyTriggered ? `"${output.policyTriggered}"` : "null"}
}`}
                          </pre>
                        </div>
                      </div>
                    </CollapsibleContent>
                  </div>
                </Collapsible>
              ))}
            </div>
          </ScrollArea>
        </CardContent>
      </Card>
    </div>
  );
}