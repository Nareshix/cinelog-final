<script lang="ts">
    import { enhance } from "$app/forms";
    import { Input } from "#lib/components/ui/input/index.js";
    import { Button } from "#lib/components/ui/button/index.js";
    import { Lock } from "lucide-svelte";

    let { form } = $props();
</script>

<div
    class="min-h-screen flex items-center justify-center px-4 bg-background text-foreground"
>
    <div
        class="w-full max-w-sm p-6 bg-card border border-border rounded-2xl shadow-xl space-y-6"
    >
        <div class="text-center space-y-2">
            <div
                class="w-12 h-12 bg-muted rounded-full flex items-center justify-center mx-auto text-primary"
            >
                <Lock class="w-6 h-6" />
            </div>
            <h1 class="text-2xl font-black tracking-tight">CineLog Vault</h1>
            <p class="text-xs text-muted-foreground">
                Enter your passphrase to access your library
            </p>
        </div>

        <form method="POST" use:enhance class="space-y-4">
            <div class="space-y-1.5">
                <Input
                    type="password"
                    name="password"
                    placeholder="Enter your password..."
                    class="h-11 text-sm"
                    required
                    autofocus
                />
                {#if form?.error}
                    <p class="text-xs text-destructive font-medium">
                        {form.error}
                    </p>
                {/if}
            </div>

            <Button type="submit" class="w-full h-11 text-sm font-semibold">
                Unlock Vault
            </Button>
        </form>
    </div>
</div>
