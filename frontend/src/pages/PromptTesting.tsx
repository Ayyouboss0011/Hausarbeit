import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

const PromptTesting = () => {
  const [prompt, setPrompt] = useState("");
  const [response, setResponse] = useState("");
  const [safetyStatus, setSafetyStatus] = useState(null);
  const [safetyReason, setSafetyReason] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setResponse("");
    setSafetyStatus(null);

    try {
      const response = await fetch('http://127.0.0.1:5001/prompt-testing', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ prompt }),
      });

      if (!response.ok) {
        throw new Error('Network response was not ok');
      }

      const data = await response.json();
      setResponse(data.llm_response);
      setSafetyStatus(data.guardian_evaluation.safety_level);
      setSafetyReason(data.guardian_evaluation.reason);
    } catch (error) {
      console.error("Failed to fetch:", error);
      setResponse("Failed to get a response from the server.");
      setSafetyStatus("error");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="p-6 space-y-6">
      <h1 className="text-2xl font-bold">Prompt Testing</h1>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Enter your Prompt</CardTitle>
            <CardDescription>
              Test the AI's response and safety classification.
            </CardDescription>
          </CardHeader>
          <form onSubmit={handleSubmit}>
            <CardContent>
              <Textarea
                placeholder="Enter your prompt here..."
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                className="min-h-[200px]"
              />
            </CardContent>
            <CardFooter>
              <Button type="submit" disabled={isLoading}>
                {isLoading ? "Testing..." : "Test Prompt"}
              </Button>
            </CardFooter>
          </form>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>AI Response</CardTitle>
            <CardDescription>
              The generated response from the AI.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {isLoading && <p>Loading...</p>}
            {response && <p className="text-sm">{response}</p>}
          </CardContent>
        </Card>
        {safetyStatus && (
          <Card className="md:col-span-2">
            <CardHeader>
              <CardTitle>GuardianAI Evaluation</CardTitle>
              <CardDescription>
                The safety analysis of the AI's response.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center space-x-2">
                <span className="font-medium">Status:</span>
                <Badge
                  variant={safetyStatus === "safe" ? "default" : "destructive"}
                >
                  {safetyStatus}
                </Badge>
              </div>
              {safetyReason && safetyStatus !== "safe" && (
                <div className="mt-4">
                  <p className="font-medium">Reason:</p>
                  <p className="text-sm text-muted-foreground mt-1">
                    {safetyReason}
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
};

export default PromptTesting;
