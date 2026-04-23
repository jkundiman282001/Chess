<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('profiles', function (Blueprint $table) {
            $table->string('board_pattern')->default('solid')->after('board_dark_color');
            $table->string('board_frame_style')->default('tournament')->after('board_pattern');
            $table->string('board_coordinate_style')->default('classic')->after('board_frame_style');
            $table->json('move_indicator_theme')->nullable()->after('board_coordinate_style');
        });
    }

    public function down(): void
    {
        Schema::table('profiles', function (Blueprint $table) {
            $table->dropColumn([
                'board_pattern',
                'board_frame_style',
                'board_coordinate_style',
                'move_indicator_theme',
            ]);
        });
    }
};
