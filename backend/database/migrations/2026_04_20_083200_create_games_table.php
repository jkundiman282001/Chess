<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('games', function (Blueprint $table): void {
            $table->id();
            $table->ulid('public_id')->unique();
            $table->foreignId('created_by_user_id')->constrained('users')->cascadeOnDelete();
            $table->foreignId('white_player_id')->nullable()->constrained('users')->nullOnDelete();
            $table->foreignId('black_player_id')->nullable()->constrained('users')->nullOnDelete();
            $table->foreignId('winner_user_id')->nullable()->constrained('users')->nullOnDelete();
            $table->string('mode', 16);
            $table->string('status', 16);
            $table->string('result', 24);
            $table->string('termination_reason', 32)->nullable();
            $table->boolean('rated')->default(false);
            $table->string('time_control_name', 32);
            $table->unsignedInteger('initial_time_seconds');
            $table->unsignedInteger('increment_seconds')->default(0);
            $table->string('starting_fen', 120);
            $table->string('current_fen', 120);
            $table->unsignedInteger('state_version')->default(0);
            $table->longText('pgn')->nullable();
            $table->string('ai_opponent_name')->nullable();
            $table->unsignedTinyInteger('ai_skill_level')->nullable();
            $table->timestamp('last_move_at')->nullable();
            $table->timestamp('started_at')->nullable();
            $table->timestamp('ended_at')->nullable();
            $table->timestamps();

            $table->index(['mode', 'status']);
            $table->index(['white_player_id', 'black_player_id']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('games');
    }
};
