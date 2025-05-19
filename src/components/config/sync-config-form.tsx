'use client';

import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { useToast } from '@/components/ui/use-toast';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

const syncConfigSchema = z.object({
  employee: z.object({
    cron_expression: z.string().min(1, 'L\'expression cron est requise'),
    is_active: z.boolean(),
  }),
  visitor: z.object({
    cron_expression: z.string().min(1, 'L\'expression cron est requise'),
    is_active: z.boolean(),
  }),
});

type SyncConfigFormValues = z.infer<typeof syncConfigSchema>;

export function SyncConfigForm() {
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);

  const form = useForm<SyncConfigFormValues>({
    resolver: zodResolver(syncConfigSchema),
    defaultValues: {
      employee: {
        cron_expression: '0 * * * *', // Toutes les heures
        is_active: true,
      },
      visitor: {
        cron_expression: '0 * * * *', // Toutes les heures
        is_active: true,
      },
    },
  });

  useEffect(() => {
    const fetchConfig = async () => {
      try {
        const response = await fetch('/api/config/sync');
        const data = await response.json();
        
        const config = {
          employee: data.find((c: any) => c.sync_type === 'employee') || {
            cron_expression: '0 * * * *',
            is_active: true,
          },
          visitor: data.find((c: any) => c.sync_type === 'visitor') || {
            cron_expression: '0 * * * *',
            is_active: true,
          },
        };

        form.reset(config);
      } catch (error) {
        console.error('Erreur lors de la récupération de la configuration:', error);
        toast({
          title: 'Erreur',
          description: 'Impossible de récupérer la configuration',
          variant: 'destructive',
        });
      }
    };

    fetchConfig();
  }, [form, toast]);

  const onSubmit = async (data: SyncConfigFormValues) => {
    setIsLoading(true);
    try {
      // Mettre à jour la configuration des employés
      await fetch('/api/config/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sync_type: 'employee',
          cron_expression: data.employee.cron_expression,
          is_active: data.employee.is_active,
        }),
      });

      // Mettre à jour la configuration des visiteurs
      await fetch('/api/config/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sync_type: 'visitor',
          cron_expression: data.visitor.cron_expression,
          is_active: data.visitor.is_active,
        }),
      });

      toast({
        title: 'Succès',
        description: 'Configuration mise à jour avec succès',
      });
    } catch (error) {
      console.error('Erreur lors de la mise à jour de la configuration:', error);
      toast({
        title: 'Erreur',
        description: 'Impossible de mettre à jour la configuration',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
        <Card>
          <CardHeader>
            <CardTitle>Synchronisation des employés</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <FormField
              control={form.control}
              name="employee.cron_expression"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Expression Cron</FormLabel>
                  <FormControl>
                    <Input placeholder="0 * * * *" {...field} />
                  </FormControl>
                  <FormDescription>
                    Format: minute heure jour_du_mois mois jour_de_la_semaine
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="employee.is_active"
              render={({ field }) => (
                <FormItem className="flex items-center justify-between rounded-lg border p-4">
                  <div className="space-y-0.5">
                    <FormLabel>Activer la synchronisation</FormLabel>
                    <FormDescription>
                      Active ou désactive la synchronisation automatique
                    </FormDescription>
                  </div>
                  <FormControl>
                    <Switch
                      checked={field.value}
                      onCheckedChange={field.onChange}
                    />
                  </FormControl>
                </FormItem>
              )}
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Synchronisation des visiteurs</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <FormField
              control={form.control}
              name="visitor.cron_expression"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Expression Cron</FormLabel>
                  <FormControl>
                    <Input placeholder="0 * * * *" {...field} />
                  </FormControl>
                  <FormDescription>
                    Format: minute heure jour_du_mois mois jour_de_la_semaine
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="visitor.is_active"
              render={({ field }) => (
                <FormItem className="flex items-center justify-between rounded-lg border p-4">
                  <div className="space-y-0.5">
                    <FormLabel>Activer la synchronisation</FormLabel>
                    <FormDescription>
                      Active ou désactive la synchronisation automatique
                    </FormDescription>
                  </div>
                  <FormControl>
                    <Switch
                      checked={field.value}
                      onCheckedChange={field.onChange}
                    />
                  </FormControl>
                </FormItem>
              )}
            />
          </CardContent>
        </Card>

        <Button type="submit" disabled={isLoading}>
          {isLoading ? 'Enregistrement...' : 'Enregistrer'}
        </Button>
      </form>
    </Form>
  );
} 