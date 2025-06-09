"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Settings2, Bell, Palette, ShieldQuestion } from 'lucide-react';

export default function SettingsPage() {
  // Mock state for settings
  // In a real app, these would be fetched and persisted
  return (
    <div className="space-y-8 max-w-2xl mx-auto">
      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle className="text-2xl md:text-3xl font-headline flex items-center">
            <Settings2 className="mr-3 h-8 w-8 text-primary"/>Application Settings
          </CardTitle>
          <CardDescription>
            Customize your Veritas AI experience. Changes are saved automatically (conceptually).
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-8">
          
          <section>
            <h3 className="text-lg font-semibold mb-3 flex items-center"><Bell className="mr-2 h-5 w-5 text-muted-foreground"/> Notifications</h3>
            <div className="space-y-4">
              <div className="flex items-center justify-between p-3 border rounded-lg">
                <div>
                  <Label htmlFor="email-notifications" className="font-medium">Email Notifications</Label>
                  <p className="text-xs text-muted-foreground">Receive updates about new features and important announcements.</p>
                </div>
                <Switch id="email-notifications" defaultChecked />
              </div>
              <div className="flex items-center justify-between p-3 border rounded-lg">
                <div>
                  <Label htmlFor="inapp-notifications" className="font-medium">In-App Notifications</Label>
                   <p className="text-xs text-muted-foreground">Show alerts for saved articles and analysis completions.</p>
                </div>
                <Switch id="inapp-notifications" defaultChecked />
              </div>
            </div>
          </section>

          <section>
            <h3 className="text-lg font-semibold mb-3 flex items-center"><Palette className="mr-2 h-5 w-5 text-muted-foreground"/> Appearance</h3>
            <div className="space-y-4">
              <div className="flex items-center justify-between p-3 border rounded-lg">
                 <div>
                    <Label htmlFor="dark-mode" className="font-medium">Dark Mode</Label>
                    <p className="text-xs text-muted-foreground">Toggle between light and dark themes.</p>
                 </div>
                <Switch id="dark-mode" disabled /> 
                 <span className="text-xs text-muted-foreground">(Coming Soon)</span>
              </div>
               <div className="p-3 border rounded-lg">
                <Label htmlFor="font-size" className="font-medium">Font Size (Conceptual)</Label>
                <p className="text-xs text-muted-foreground mb-2">Adjust the text size across the application.</p>
                <Button variant="outline" size="sm" disabled>Small</Button>
                <Button variant="secondary" size="sm" className="mx-2" disabled>Medium</Button>
                <Button variant="outline" size="sm" disabled>Large</Button>
              </div>
            </div>
          </section>

          <section>
            <h3 className="text-lg font-semibold mb-3 flex items-center"><ShieldQuestion className="mr-2 h-5 w-5 text-muted-foreground"/> Privacy & Data</h3>
             <div className="space-y-4">
              <div className="p-3 border rounded-lg">
                <Label className="font-medium">Manage Your Data</Label>
                <p className="text-xs text-muted-foreground mb-2">Control your personal information and saved content.</p>
                <Button variant="outline" size="sm" disabled>Export My Data (Not Implemented)</Button>
                <Button variant="destructive" size="sm" className="ml-2" disabled>Delete My Account (Not Implemented)</Button>
              </div>
            </div>
          </section>

        </CardContent>
      </Card>
    </div>
  );
}
