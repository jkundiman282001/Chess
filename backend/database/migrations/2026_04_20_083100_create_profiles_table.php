<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('profiles', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete()->unique();
            $table->text('bio')->nullable();
            $table->char('country_code', 2)->nullable();
            $table->string('avatar_path')->nullable();
            $table->unsignedInteger('ranked_rating')->default(1200);
            $table->unsignedInteger('highest_ranked_rating')->default(1200);
            $table->unsignedBigInteger('experience')->default(0);
            $table->unsignedInteger('level')->default(1);
            $table->unsignedBigInteger('soft_currency')->default(0);
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('profiles');
    }
};
