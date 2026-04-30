<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('friendships', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('requester_user_id')->constrained('users')->cascadeOnDelete();
            $table->foreignId('addressee_user_id')->constrained('users')->cascadeOnDelete();
            $table->string('status', 16)->default('pending');
            $table->timestamp('responded_at')->nullable();
            $table->timestamps();

            $table->unique(['requester_user_id', 'addressee_user_id'], 'friendships_requester_addressee_unique');
            $table->index(['status', 'requester_user_id']);
            $table->index(['status', 'addressee_user_id']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('friendships');
    }
};
