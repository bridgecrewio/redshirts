import { Command } from "@oclif/core";
import { SourceInfo, SourceType } from "./types";


export default abstract class RedshirtsVcsCommand extends Command {
    abstract getSourceInfo(token: string, baseUrl: string, sourceType: SourceType): SourceInfo;
}