import { useState } from "react";
import { DashboardLayout } from "@/components/DashboardLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { AlertCircle, ExternalLink, ShieldCheck } from "lucide-react";

const STATUS_PAGE_URL = "https://h2dstatus.cronitorstatus.com/";

const SystemStatus = () => {
  const [loaded, setLoaded] = useState(false);
  const [failed, setFailed] = useState(false);

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="flex items-center gap-2 text-2xl font-bold text-foreground">
              <ShieldCheck className="h-6 w-6 text-primary" />
              System Status
            </h2>
            <p className="text-muted-foreground">
              Live uptime and incident history for GoDevelopers infrastructure.
            </p>
          </div>
          <Button variant="outline" asChild>
            <a href={STATUS_PAGE_URL} target="_blank" rel="noopener noreferrer">
              Open in new tab <ExternalLink className="ml-2 h-4 w-4" />
            </a>
          </Button>
        </div>

        <Card className="border-border overflow-hidden">
          <CardContent className="p-0">
            {failed ? (
              <div className="flex flex-col items-center gap-3 py-16 text-center">
                <AlertCircle className="h-6 w-6 text-destructive" />
                <p className="text-sm text-muted-foreground">
                  Couldn't embed the status page here.
                </p>
                <Button variant="outline" size="sm" asChild>
                  <a href={STATUS_PAGE_URL} target="_blank" rel="noopener noreferrer">
                    View status page <ExternalLink className="ml-2 h-3.5 w-3.5" />
                  </a>
                </Button>
              </div>
            ) : (
              <>
                {!loaded && <Skeleton className="h-[80vh] w-full rounded-none" />}
                <iframe
                  src={STATUS_PAGE_URL}
                  title="System status"
                  className={loaded ? "h-[80vh] w-full border-0" : "hidden"}
                  onLoad={() => setLoaded(true)}
                  onError={() => setFailed(true)}
                  sandbox="allow-scripts allow-same-origin allow-popups"
                  referrerPolicy="no-referrer"
                />
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
};

export default SystemStatus;
