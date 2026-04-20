<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('game_moves', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('game_id')->constrained()->cascadeOnDelete();
            $table->foreignId('by_user_id')->nullable()->constrained('users')->nullOnDelete();
            $table->unsignedSmallInteger('ply');
            $table->unsignedSmallInteger('move_number');
            $table->string('san', 32);
            $table->string('uci', 8);
            $table->string('fen_after', 120);
            $table->unsignedInteger('move_time_ms')->nullable();
            $table->timestamp('created_at')->useCurrent();

            $table->unique(['game_id', 'ply']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('game_moves');
    }
};
