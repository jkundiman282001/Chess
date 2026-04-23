<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('cosmetic_items', function (Blueprint $table): void {
            $table->json('assets')->nullable()->after('preview');
        });
    }

    public function down(): void
    {
        Schema::table('cosmetic_items', function (Blueprint $table): void {
            $table->dropColumn('assets');
        });
    }
};
