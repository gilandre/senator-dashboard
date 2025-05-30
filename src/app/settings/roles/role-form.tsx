'use client';

import { useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { DialogFooter } from "@/components/ui/dialog";
import { Loader2 } from "lucide-react";
import axios from "axios";
import { toast } from "@/components/ui/use-toast";

// Définir le schéma de validation
const roleFormSchema = z.object({
  name: z.string().min(2, {
    message: "Le nom du rôle doit contenir au moins 2 caractères.",
  }).refine(value => /^[a-z0-9_]+$/.test(value), {
    message: "Le nom ne doit contenir que des lettres minuscules, des chiffres et des underscores."
  }),
  description: z.string().optional(),
  is_active: z.boolean().default(true),
  is_default: z.boolean().default(false),
});

type RoleFormValues = z.infer<typeof roleFormSchema>;

interface RoleFormProps {
  initialData?: any;
  onSuccess?: () => void;
  onCancel?: () => void;
}

export function RoleForm({ initialData, onSuccess, onCancel }: RoleFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const isEditing = !!initialData;

  // Définir les valeurs par défaut du formulaire
  const defaultValues: Partial<RoleFormValues> = {
    name: initialData?.name || "",
    description: initialData?.description || "",
    is_active: initialData?.is_active ?? true,
    is_default: initialData?.is_default ?? false,
  };

  const form = useForm<RoleFormValues>({
    resolver: zodResolver(roleFormSchema),
    defaultValues,
  });

  async function onSubmit(data: RoleFormValues) {
    setIsSubmitting(true);
    try {
      let response;
      
      if (isEditing) {
        response = await axios.patch(`/api/roles/${initialData.id}`, data);
        toast({
          title: "Rôle mis à jour",
          description: "Le rôle a été modifié avec succès.",
        });
      } else {
        response = await axios.post("/api/roles", data);
        toast({
          title: "Rôle créé",
          description: "Le nouveau rôle a été créé avec succès.",
        });
      }
      
      // Synchroniser avec les données de référence
      await axios.post("/api/reference-data/sync");
      
      if (onSuccess) onSuccess();
    } catch (error: any) {
      toast({
        title: "Erreur",
        description: error.response?.data?.error || "Une erreur s'est produite",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Nom du rôle</FormLabel>
              <FormControl>
                <Input 
                  placeholder="nom_du_role" 
                  {...field} 
                  disabled={isSubmitting || (isEditing && initialData.name === 'admin')}
                />
              </FormControl>
              <FormDescription>
                Identifiant unique du rôle (lettres minuscules, chiffres et underscores)
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="description"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Description</FormLabel>
              <FormControl>
                <Textarea
                  placeholder="Description du rôle et de ses permissions"
                  {...field}
                  disabled={isSubmitting}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="flex space-x-4">
          <FormField
            control={form.control}
            name="is_active"
            render={({ field }) => (
              <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                <FormControl>
                  <Checkbox
                    checked={field.value}
                    onCheckedChange={field.onChange}
                    disabled={isSubmitting}
                  />
                </FormControl>
                <div className="space-y-1 leading-none">
                  <FormLabel>Actif</FormLabel>
                  <FormDescription>
                    Les rôles inactifs ne peuvent pas être attribués aux utilisateurs
                  </FormDescription>
                </div>
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="is_default"
            render={({ field }) => (
              <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                <FormControl>
                  <Checkbox
                    checked={field.value}
                    onCheckedChange={field.onChange}
                    disabled={isSubmitting}
                  />
                </FormControl>
                <div className="space-y-1 leading-none">
                  <FormLabel>Par défaut</FormLabel>
                  <FormDescription>
                    Rôle par défaut pour les nouveaux utilisateurs
                  </FormDescription>
                </div>
              </FormItem>
            )}
          />
        </div>

        <DialogFooter>
          <Button 
            type="button" 
            variant="outline" 
            onClick={onCancel}
            disabled={isSubmitting}
          >
            Annuler
          </Button>
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {isEditing ? "Mettre à jour" : "Créer"}
          </Button>
        </DialogFooter>
      </form>
    </Form>
  );
} 