<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('games', function (Blueprint $table): void {
            $table->unsignedBigInteger('reward_soft_currency')->default(0)->after('ai_skill_level');
            $table->unsignedBigInteger('reward_experience')->default(0)->after('reward_soft_currency');
            $table->timestamp('rewards_granted_at')->nullable()->after('reward_experience');
        });
    }

    public function down(): void
    {
        Schema::table('games', function (Blueprint $table): void {
            $table->dropColumn([
                'reward_soft_currency',
                'reward_experience',
                'rewards_granted_at',
            ]);
        });
    }
};
